// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ConfidentialSwapRouter
 * @notice EVM implementation of Veil's encrypted order flow for MEV protection.
 * @dev Orders are encrypted client-side using @veil/orders (NaCl box).
 *      The solver decrypts off-chain and executes with commitment verification.
 *      This proves Veil's chain-agnostic claim beyond Solana.
 */
contract ConfidentialSwapRouter {

    enum OrderStatus { Pending, Completed, Cancelled }

    struct SolverConfig {
        address authority;
        bytes32 encryptionPubKey; // Solver's X25519 public key
        uint16 feeBps;
        uint64 totalOrders;
        uint256 totalVolume;
        bool isActive;
    }

    struct EncryptedOrder {
        address owner;
        uint64 orderId;
        address inputToken;
        address outputToken;
        uint256 inputAmount;
        uint256 minOutputAmount;   // Set after execution
        uint256 outputAmount;      // Set after execution
        bytes encryptedPayload;    // NaCl box ciphertext (max 128 bytes)
        bytes32 payloadHash;       // SHA-256 commitment of plaintext
        OrderStatus status;
        uint64 createdAt;
        uint64 executedAt;
        address executedBy;
    }

    SolverConfig public solverConfig;
    mapping(bytes32 => EncryptedOrder) public orders;

    uint16 public constant MAX_FEE_BPS = 500;
    uint256 public constant MIN_PAYLOAD_SIZE = 24;
    uint256 public constant MAX_PAYLOAD_SIZE = 128;

    event SolverInitialized(address indexed authority, bytes32 encryptionPubKey, uint16 feeBps);
    event OrderSubmitted(bytes32 indexed orderKey, address indexed owner, uint64 orderId, uint256 inputAmount);
    event OrderExecuted(bytes32 indexed orderKey, address indexed solver, uint256 outputAmount);
    event OrderCancelled(bytes32 indexed orderKey, address indexed owner);

    error SolverNotActive();
    error InvalidPayloadLength();
    error InvalidInputAmount();
    error UnauthorizedOwner();
    error UnauthorizedSolver();
    error OrderNotPending();
    error SlippageExceeded();
    error OrderExpired();
    error PayloadHashMismatch();
    error AlreadyInitialized();
    error InvalidFeeBps();
    error TransferFailed();
    error NothingToClaim();

    modifier onlySolver() {
        if (msg.sender != solverConfig.authority) revert UnauthorizedSolver();
        if (!solverConfig.isActive) revert SolverNotActive();
        _;
    }

    function initializeSolver(
        bytes32 encryptionPubKey,
        uint16 feeBps
    ) external {
        if (solverConfig.authority != address(0)) revert AlreadyInitialized();
        if (feeBps > MAX_FEE_BPS) revert InvalidFeeBps();

        solverConfig = SolverConfig({
            authority: msg.sender,
            encryptionPubKey: encryptionPubKey,
            feeBps: feeBps,
            totalOrders: 0,
            totalVolume: 0,
            isActive: true
        });

        emit SolverInitialized(msg.sender, encryptionPubKey, feeBps);
    }

    /**
     * @notice Submit an encrypted swap order
     * @param orderId Unique order ID chosen by user
     * @param inputToken ERC-20 token to sell
     * @param outputToken ERC-20 token to buy
     * @param inputAmount Amount of input tokens
     * @param encryptedPayload NaCl box encrypted order params
     * @param payloadHash SHA-256 hash of plaintext payload (commitment)
     */
    function submitOrder(
        uint64 orderId,
        address inputToken,
        address outputToken,
        uint256 inputAmount,
        bytes calldata encryptedPayload,
        bytes32 payloadHash
    ) external {
        if (!solverConfig.isActive) revert SolverNotActive();
        if (inputAmount == 0) revert InvalidInputAmount();
        if (encryptedPayload.length < MIN_PAYLOAD_SIZE || encryptedPayload.length > MAX_PAYLOAD_SIZE) {
            revert InvalidPayloadLength();
        }

        bytes32 orderKey = _orderKey(msg.sender, orderId);

        _safeTransferFrom(inputToken, msg.sender, address(this), inputAmount);

        orders[orderKey] = EncryptedOrder({
            owner: msg.sender,
            orderId: orderId,
            inputToken: inputToken,
            outputToken: outputToken,
            inputAmount: inputAmount,
            minOutputAmount: 0,
            outputAmount: 0,
            encryptedPayload: encryptedPayload,
            payloadHash: payloadHash,
            status: OrderStatus.Pending,
            createdAt: uint64(block.timestamp),
            executedAt: 0,
            executedBy: address(0)
        });

        emit OrderSubmitted(orderKey, msg.sender, orderId, inputAmount);
    }

    /**
     * @notice Execute an encrypted order (solver only)
     * @dev Solver decrypts off-chain, then proves honest decryption via commitment hash.
     *      The serialized payload layout must match the SWAP_ORDER_SCHEMA:
     *      minOutputAmount(u64 LE, 8) + slippageBps(u16 LE, 2) + deadline(i64 LE, 8) + padding(6 zeros) = 24 bytes
     */
    function executeOrder(
        address owner,
        uint64 orderId,
        uint64 decryptedMinOutput,
        uint16 decryptedSlippageBps,
        int64 decryptedDeadline,
        uint256 actualOutputAmount
    ) external onlySolver {
        bytes32 orderKey = _orderKey(owner, orderId);
        EncryptedOrder storage order = orders[orderKey];

        if (order.status != OrderStatus.Pending) revert OrderNotPending();

        // Verify commitment: reconstruct serialized payload and hash it
        bytes memory payload = new bytes(24);

        // minOutputAmount as u64 LE
        for (uint256 i = 0; i < 8; i++) {
            payload[i] = bytes1(uint8(decryptedMinOutput >> (i * 8)));
        }
        // slippageBps as u16 LE
        payload[8] = bytes1(uint8(decryptedSlippageBps));
        payload[9] = bytes1(uint8(decryptedSlippageBps >> 8));
        // deadline as i64 LE
        uint64 deadlineUint = uint64(decryptedDeadline);
        for (uint256 i = 0; i < 8; i++) {
            payload[10 + i] = bytes1(uint8(deadlineUint >> (i * 8)));
        }
        // bytes 18-23 are already zero (padding)

        bytes32 computedHash = sha256(payload);
        if (computedHash != order.payloadHash) revert PayloadHashMismatch();

        // Verify deadline
        if (block.timestamp > uint64(decryptedDeadline)) revert OrderExpired();

        // Verify slippage
        if (actualOutputAmount < decryptedMinOutput) revert SlippageExceeded();

        // Transfer input tokens to solver
        _safeTransfer(order.inputToken, msg.sender, order.inputAmount);

        // Transfer output tokens from solver to contract
        _safeTransferFrom(order.outputToken, msg.sender, address(this), actualOutputAmount);

        // Update order
        order.status = OrderStatus.Completed;
        order.minOutputAmount = decryptedMinOutput;
        order.outputAmount = actualOutputAmount;
        order.executedAt = uint64(block.timestamp);
        order.executedBy = msg.sender;

        solverConfig.totalOrders++;
        solverConfig.totalVolume += order.inputAmount;

        emit OrderExecuted(orderKey, msg.sender, actualOutputAmount);
    }

    /**
     * @notice Cancel a pending order and reclaim input tokens
     */
    function cancelOrder(uint64 orderId) external {
        bytes32 orderKey = _orderKey(msg.sender, orderId);
        EncryptedOrder storage order = orders[orderKey];

        if (order.owner != msg.sender) revert UnauthorizedOwner();
        if (order.status != OrderStatus.Pending) revert OrderNotPending();

        order.status = OrderStatus.Cancelled;

        _safeTransfer(order.inputToken, msg.sender, order.inputAmount);

        emit OrderCancelled(orderKey, msg.sender);
    }

    /**
     * @notice Claim output tokens after order execution
     */
    function claimOutput(uint64 orderId) external {
        bytes32 orderKey = _orderKey(msg.sender, orderId);
        EncryptedOrder storage order = orders[orderKey];

        if (order.owner != msg.sender) revert UnauthorizedOwner();
        if (order.status != OrderStatus.Completed) revert OrderNotPending();
        if (order.outputAmount == 0) revert NothingToClaim();

        uint256 amount = order.outputAmount;
        order.outputAmount = 0; // prevent re-entrancy

        _safeTransfer(order.outputToken, msg.sender, amount);
    }

    function getOrder(address owner, uint64 orderId) external view returns (EncryptedOrder memory) {
        return orders[_orderKey(owner, orderId)];
    }

    function _orderKey(address owner, uint64 orderId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner, orderId));
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
