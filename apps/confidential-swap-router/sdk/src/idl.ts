export type ConfidentialSwapRouter = {
  "address": "v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM",
  "version": "0.1.0",
  "name": "confidential_swap_router",
  "instructions": [
    {
      "name": "initializeSolver",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "solverConfig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "solverPubkey",
          "type": "pubkey"
        },
        {
          "name": "feeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "submitOrder",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "solverConfig",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "inputMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "outputMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userInputToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orderVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "orderId",
          "type": "u64"
        },
        {
          "name": "inputAmount",
          "type": "u64"
        },
        {
          "name": "encryptedPayload",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "executeOrder",
      "accounts": [
        {
          "name": "solver",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "solverConfig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "inputMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "outputMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "outputVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "solverInputToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "solverOutputToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "decryptedMinOutput",
          "type": "u64"
        },
        {
          "name": "actualOutputAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cancelOrder",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "inputMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userInputToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "claimOutput",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "outputMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "outputVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userOutputToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "solverConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "solverPubkey",
            "type": "pubkey"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "totalOrders",
            "type": "u64"
          },
          {
            "name": "totalVolume",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "encryptedOrder",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "orderId",
            "type": "u64"
          },
          {
            "name": "inputMint",
            "type": "pubkey"
          },
          {
            "name": "outputMint",
            "type": "pubkey"
          },
          {
            "name": "inputAmount",
            "type": "u64"
          },
          {
            "name": "minOutputAmount",
            "type": "u64"
          },
          {
            "name": "outputAmount",
            "type": "u64"
          },
          {
            "name": "encryptedPayload",
            "type": "bytes"
          },
          {
            "name": "status",
            "type": {
              "defined": "OrderStatus"
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "executedAt",
            "type": "i64"
          },
          {
            "name": "executedBy",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "executionSignature",
            "type": "bytes"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "OrderStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Pending"
          },
          {
            "name": "Executing"
          },
          {
            "name": "Completed"
          },
          {
            "name": "Cancelled"
          },
          {
            "name": "Failed"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "OrderNotCancellable",
      "msg": "Order is not in a cancellable state"
    },
    {
      "code": 6001,
      "name": "OrderNotExecutable",
      "msg": "Order is not in an executable state"
    },
    {
      "code": 6002,
      "name": "OrderNotClaimable",
      "msg": "Order is not in a claimable state"
    },
    {
      "code": 6003,
      "name": "UnauthorizedOwner",
      "msg": "Unauthorized owner"
    },
    {
      "code": 6004,
      "name": "UnauthorizedSolver",
      "msg": "Unauthorized solver"
    },
    {
      "code": 6005,
      "name": "InvalidPayloadLength",
      "msg": "Invalid encrypted payload length"
    },
    {
      "code": 6006,
      "name": "SlippageExceeded",
      "msg": "Slippage tolerance exceeded"
    },
    {
      "code": 6007,
      "name": "OrderExpired",
      "msg": "Order has expired"
    },
    {
      "code": 6008,
      "name": "SolverNotActive",
      "msg": "Solver is not active"
    },
    {
      "code": 6009,
      "name": "InvalidInputAmount",
      "msg": "Invalid input amount"
    },
    {
      "code": 6010,
      "name": "InvalidTokenMint",
      "msg": "Invalid token mint"
    },
    {
      "code": 6011,
      "name": "ArithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6012,
      "name": "AlreadyClaimed",
      "msg": "Output already claimed"
    }
  ],
  "metadata": {
    "address": "v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM"
  }
};

export const IDL: ConfidentialSwapRouter = {
  "address": "v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM",
  "version": "0.1.0",
  "name": "confidential_swap_router",
  "instructions": [
    {
      "name": "initializeSolver",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "solverConfig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "solverPubkey",
          "type": "pubkey"
        },
        {
          "name": "feeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "submitOrder",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "solverConfig",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "inputMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "outputMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userInputToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orderVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "orderId",
          "type": "u64"
        },
        {
          "name": "inputAmount",
          "type": "u64"
        },
        {
          "name": "encryptedPayload",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "executeOrder",
      "accounts": [
        {
          "name": "solver",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "solverConfig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "inputMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "outputMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "outputVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "solverInputToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "solverOutputToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "decryptedMinOutput",
          "type": "u64"
        },
        {
          "name": "actualOutputAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cancelOrder",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "inputMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "orderVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userInputToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "claimOutput",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "outputMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "outputVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userOutputToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "solverConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "solverPubkey",
            "type": "pubkey"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "totalOrders",
            "type": "u64"
          },
          {
            "name": "totalVolume",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "encryptedOrder",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "orderId",
            "type": "u64"
          },
          {
            "name": "inputMint",
            "type": "pubkey"
          },
          {
            "name": "outputMint",
            "type": "pubkey"
          },
          {
            "name": "inputAmount",
            "type": "u64"
          },
          {
            "name": "minOutputAmount",
            "type": "u64"
          },
          {
            "name": "outputAmount",
            "type": "u64"
          },
          {
            "name": "encryptedPayload",
            "type": "bytes"
          },
          {
            "name": "status",
            "type": {
              "defined": "OrderStatus"
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "executedAt",
            "type": "i64"
          },
          {
            "name": "executedBy",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "executionSignature",
            "type": "bytes"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "OrderStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Pending"
          },
          {
            "name": "Executing"
          },
          {
            "name": "Completed"
          },
          {
            "name": "Cancelled"
          },
          {
            "name": "Failed"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "OrderNotCancellable",
      "msg": "Order is not in a cancellable state"
    },
    {
      "code": 6001,
      "name": "OrderNotExecutable",
      "msg": "Order is not in an executable state"
    },
    {
      "code": 6002,
      "name": "OrderNotClaimable",
      "msg": "Order is not in a claimable state"
    },
    {
      "code": 6003,
      "name": "UnauthorizedOwner",
      "msg": "Unauthorized owner"
    },
    {
      "code": 6004,
      "name": "UnauthorizedSolver",
      "msg": "Unauthorized solver"
    },
    {
      "code": 6005,
      "name": "InvalidPayloadLength",
      "msg": "Invalid encrypted payload length"
    },
    {
      "code": 6006,
      "name": "SlippageExceeded",
      "msg": "Slippage tolerance exceeded"
    },
    {
      "code": 6007,
      "name": "OrderExpired",
      "msg": "Order has expired"
    },
    {
      "code": 6008,
      "name": "SolverNotActive",
      "msg": "Solver is not active"
    },
    {
      "code": 6009,
      "name": "InvalidInputAmount",
      "msg": "Invalid input amount"
    },
    {
      "code": 6010,
      "name": "InvalidTokenMint",
      "msg": "Invalid token mint"
    },
    {
      "code": 6011,
      "name": "ArithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6012,
      "name": "AlreadyClaimed",
      "msg": "Output already claimed"
    }
  ],
  "metadata": {
    "address": "v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM"
  }
};
