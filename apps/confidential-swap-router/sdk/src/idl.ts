export type ConfidentialSwapRouter = {
  "address": "v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM",
  "version": "0.1.0",
  "name": "confidential_swap_router",
  "instructions": [
    {
      "name": "initializeSolver",
      "discriminator": [93, 104, 26, 39, 243, 139, 10, 223],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "solverConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [115, 111, 108, 118, 101, 114, 95, 99, 111, 110, 102, 105, 103]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "discriminator": [230, 150, 200, 53, 92, 208, 109, 108],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "solverConfig"
        },
        {
          "name": "order",
          "writable": true
        },
        {
          "name": "inputMint"
        },
        {
          "name": "outputMint"
        },
        {
          "name": "userInputToken",
          "writable": true
        },
        {
          "name": "orderVault",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "discriminator": [115, 61, 180, 24, 168, 32, 215, 20],
      "accounts": [
        {
          "name": "solver",
          "writable": true,
          "signer": true
        },
        {
          "name": "solverConfig",
          "writable": true
        },
        {
          "name": "order",
          "writable": true
        },
        {
          "name": "inputMint"
        },
        {
          "name": "outputMint"
        },
        {
          "name": "orderVault",
          "writable": true
        },
        {
          "name": "outputVault",
          "writable": true
        },
        {
          "name": "solverInputToken",
          "writable": true
        },
        {
          "name": "solverOutputToken",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "discriminator": [95, 129, 237, 240, 8, 49, 223, 132],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "order",
          "writable": true
        },
        {
          "name": "inputMint"
        },
        {
          "name": "orderVault",
          "writable": true
        },
        {
          "name": "userInputToken",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claimOutput",
      "discriminator": [150, 201, 54, 233, 4, 59, 65, 32],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "order",
          "writable": true
        },
        {
          "name": "outputMint"
        },
        {
          "name": "outputVault",
          "writable": true
        },
        {
          "name": "userOutputToken",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "solverConfig",
      "discriminator": [224, 189, 236, 109, 124, 58, 53, 146]
    },
    {
      "name": "encryptedOrder",
      "discriminator": [82, 52, 93, 72, 209, 212, 50, 250]
    }
  ],
  "types": [
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
              "defined": {
                "name": "orderStatus"
              }
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
    },
    {
      "name": "orderStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "executing"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          },
          {
            "name": "failed"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "orderNotCancellable",
      "msg": "Order is not in a cancellable state"
    },
    {
      "code": 6001,
      "name": "orderNotExecutable",
      "msg": "Order is not in an executable state"
    },
    {
      "code": 6002,
      "name": "orderNotClaimable",
      "msg": "Order is not in a claimable state"
    },
    {
      "code": 6003,
      "name": "unauthorizedOwner",
      "msg": "Unauthorized owner"
    },
    {
      "code": 6004,
      "name": "unauthorizedSolver",
      "msg": "Unauthorized solver"
    },
    {
      "code": 6005,
      "name": "invalidPayloadLength",
      "msg": "Invalid encrypted payload length"
    },
    {
      "code": 6006,
      "name": "slippageExceeded",
      "msg": "Slippage tolerance exceeded"
    },
    {
      "code": 6007,
      "name": "orderExpired",
      "msg": "Order has expired"
    },
    {
      "code": 6008,
      "name": "solverNotActive",
      "msg": "Solver is not active"
    },
    {
      "code": 6009,
      "name": "invalidInputAmount",
      "msg": "Invalid input amount"
    },
    {
      "code": 6010,
      "name": "invalidTokenMint",
      "msg": "Invalid token mint"
    },
    {
      "code": 6011,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6012,
      "name": "alreadyClaimed",
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
      "discriminator": [93, 104, 26, 39, 243, 139, 10, 223],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "solverConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [115, 111, 108, 118, 101, 114, 95, 99, 111, 110, 102, 105, 103]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "discriminator": [230, 150, 200, 53, 92, 208, 109, 108],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "solverConfig"
        },
        {
          "name": "order",
          "writable": true
        },
        {
          "name": "inputMint"
        },
        {
          "name": "outputMint"
        },
        {
          "name": "userInputToken",
          "writable": true
        },
        {
          "name": "orderVault",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "discriminator": [115, 61, 180, 24, 168, 32, 215, 20],
      "accounts": [
        {
          "name": "solver",
          "writable": true,
          "signer": true
        },
        {
          "name": "solverConfig",
          "writable": true
        },
        {
          "name": "order",
          "writable": true
        },
        {
          "name": "inputMint"
        },
        {
          "name": "outputMint"
        },
        {
          "name": "orderVault",
          "writable": true
        },
        {
          "name": "outputVault",
          "writable": true
        },
        {
          "name": "solverInputToken",
          "writable": true
        },
        {
          "name": "solverOutputToken",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "discriminator": [95, 129, 237, 240, 8, 49, 223, 132],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "order",
          "writable": true
        },
        {
          "name": "inputMint"
        },
        {
          "name": "orderVault",
          "writable": true
        },
        {
          "name": "userInputToken",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claimOutput",
      "discriminator": [150, 201, 54, 233, 4, 59, 65, 32],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "order",
          "writable": true
        },
        {
          "name": "outputMint"
        },
        {
          "name": "outputVault",
          "writable": true
        },
        {
          "name": "userOutputToken",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "solverConfig",
      "discriminator": [224, 189, 236, 109, 124, 58, 53, 146]
    },
    {
      "name": "encryptedOrder",
      "discriminator": [82, 52, 93, 72, 209, 212, 50, 250]
    }
  ],
  "types": [
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
              "defined": {
                "name": "orderStatus"
              }
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
    },
    {
      "name": "orderStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "executing"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          },
          {
            "name": "failed"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "orderNotCancellable",
      "msg": "Order is not in a cancellable state"
    },
    {
      "code": 6001,
      "name": "orderNotExecutable",
      "msg": "Order is not in an executable state"
    },
    {
      "code": 6002,
      "name": "orderNotClaimable",
      "msg": "Order is not in a claimable state"
    },
    {
      "code": 6003,
      "name": "unauthorizedOwner",
      "msg": "Unauthorized owner"
    },
    {
      "code": 6004,
      "name": "unauthorizedSolver",
      "msg": "Unauthorized solver"
    },
    {
      "code": 6005,
      "name": "invalidPayloadLength",
      "msg": "Invalid encrypted payload length"
    },
    {
      "code": 6006,
      "name": "slippageExceeded",
      "msg": "Slippage tolerance exceeded"
    },
    {
      "code": 6007,
      "name": "orderExpired",
      "msg": "Order has expired"
    },
    {
      "code": 6008,
      "name": "solverNotActive",
      "msg": "Solver is not active"
    },
    {
      "code": 6009,
      "name": "invalidInputAmount",
      "msg": "Invalid input amount"
    },
    {
      "code": 6010,
      "name": "invalidTokenMint",
      "msg": "Invalid token mint"
    },
    {
      "code": 6011,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6012,
      "name": "alreadyClaimed",
      "msg": "Output already claimed"
    }
  ],
  "metadata": {
    "address": "v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM"
  }
};
