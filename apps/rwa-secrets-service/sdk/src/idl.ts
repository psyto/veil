export type RwaSecrets = {
  "address": "DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam",
  "version": "0.1.0",
  "name": "rwa_secrets",
  "instructions": [
    {
      "name": "initializeProtocol",
      "discriminator": [188, 233, 252, 106, 134, 146, 202, 91],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [112, 114, 111, 116, 111, 99, 111, 108, 95, 99, 111, 110, 102, 105, 103]
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
          "name": "admin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "registerAsset",
      "discriminator": [21, 80, 155, 149, 117, 207, 235, 16],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolConfig",
          "writable": true
        },
        {
          "name": "asset",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "assetId",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "assetType",
          "type": {
            "defined": {
              "name": "assetType"
            }
          }
        },
        {
          "name": "encryptedMetadata",
          "type": "bytes"
        },
        {
          "name": "issuerEncryptionPubkey",
          "type": {
            "array": ["u8", 32]
          }
        }
      ]
    },
    {
      "name": "grantAccess",
      "discriminator": [66, 88, 87, 113, 39, 22, 27, 165],
      "accounts": [
        {
          "name": "grantor",
          "writable": true,
          "signer": true
        },
        {
          "name": "grantee"
        },
        {
          "name": "asset",
          "writable": true
        },
        {
          "name": "accessGrant",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "accessLevel",
          "type": {
            "defined": {
              "name": "accessLevel"
            }
          }
        },
        {
          "name": "encryptedKeyShare",
          "type": "bytes"
        },
        {
          "name": "expiresAt",
          "type": "i64"
        },
        {
          "name": "canDelegate",
          "type": "bool"
        }
      ]
    },
    {
      "name": "revokeAccess",
      "discriminator": [106, 128, 38, 169, 103, 238, 102, 147],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "asset"
        },
        {
          "name": "accessGrant",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "logAccess",
      "discriminator": [196, 55, 194, 24, 5, 224, 161, 204],
      "accounts": [
        {
          "name": "accessor",
          "writable": true,
          "signer": true
        },
        {
          "name": "asset"
        },
        {
          "name": "accessGrant",
          "optional": true
        },
        {
          "name": "auditLog",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "accessType",
          "type": {
            "defined": {
              "name": "accessType"
            }
          }
        },
        {
          "name": "requestMetadata",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "updateMetadata",
      "discriminator": [170, 182, 43, 239, 97, 78, 225, 186],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true
        },
        {
          "name": "asset",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "newEncryptedMetadata",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "deactivateAsset",
      "discriminator": [253, 61, 105, 242, 213, 181, 171, 120],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true
        },
        {
          "name": "asset",
          "writable": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "protocolConfig",
      "discriminator": [207, 91, 250, 28, 152, 179, 215, 209]
    },
    {
      "name": "rwaAsset",
      "discriminator": [62, 30, 88, 81, 99, 223, 144, 27]
    },
    {
      "name": "accessGrant",
      "discriminator": [167, 55, 184, 237, 74, 242, 0, 109]
    },
    {
      "name": "auditLog",
      "discriminator": [230, 207, 176, 233, 170, 130, 101, 244]
    }
  ],
  "types": [
    {
      "name": "protocolConfig",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "admin", "type": "pubkey" },
          { "name": "assetCount", "type": "u64" },
          { "name": "isPaused", "type": "bool" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "rwaAsset",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "issuer", "type": "pubkey" },
          { "name": "assetId", "type": { "array": ["u8", 32] } },
          { "name": "assetType", "type": { "defined": { "name": "assetType" } } },
          { "name": "encryptedMetadata", "type": "bytes" },
          { "name": "issuerEncryptionPubkey", "type": { "array": ["u8", 32] } },
          { "name": "status", "type": { "defined": { "name": "assetStatus" } } },
          { "name": "createdAt", "type": "i64" },
          { "name": "updatedAt", "type": "i64" },
          { "name": "accessGrantCount", "type": "u32" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "accessGrant",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "asset", "type": "pubkey" },
          { "name": "grantee", "type": "pubkey" },
          { "name": "grantor", "type": "pubkey" },
          { "name": "accessLevel", "type": { "defined": { "name": "accessLevel" } } },
          { "name": "encryptedKeyShare", "type": "bytes" },
          { "name": "grantedAt", "type": "i64" },
          { "name": "expiresAt", "type": "i64" },
          { "name": "canDelegate", "type": "bool" },
          { "name": "isRevoked", "type": "bool" },
          { "name": "revokedAt", "type": "i64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "auditLog",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "asset", "type": "pubkey" },
          { "name": "accessor", "type": "pubkey" },
          { "name": "accessType", "type": { "defined": { "name": "accessType" } } },
          { "name": "timestamp", "type": "i64" },
          { "name": "requestMetadata", "type": "bytes" },
          { "name": "wasGranted", "type": "bool" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "assetType",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "realEstate" },
          { "name": "securities" },
          { "name": "commodities" },
          { "name": "receivables" },
          { "name": "intellectualProperty" },
          { "name": "equipment" },
          { "name": "other" }
        ]
      }
    },
    {
      "name": "assetStatus",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "active" },
          { "name": "inactive" },
          { "name": "frozen" },
          { "name": "transferred" }
        ]
      }
    },
    {
      "name": "accessLevel",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "viewBasic" },
          { "name": "viewFull" },
          { "name": "auditor" },
          { "name": "admin" }
        ]
      }
    },
    {
      "name": "accessType",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "viewBasic" },
          { "name": "viewFull" },
          { "name": "audit" },
          { "name": "transferRequest" },
          { "name": "download" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "protocolPaused", "msg": "Protocol is paused" },
    { "code": 6001, "name": "assetNotActive", "msg": "Asset is not active" },
    { "code": 6002, "name": "assetFrozen", "msg": "Asset is frozen" },
    { "code": 6003, "name": "accessExpired", "msg": "Access grant has expired" },
    { "code": 6004, "name": "accessRevoked", "msg": "Access has been revoked" },
    { "code": 6005, "name": "alreadyRevoked", "msg": "Access is already revoked" },
    { "code": 6006, "name": "insufficientAccessLevel", "msg": "Insufficient access level" },
    { "code": 6007, "name": "unauthorizedIssuer", "msg": "Unauthorized: only the issuer can perform this action" },
    { "code": 6008, "name": "unauthorizedRevoker", "msg": "Unauthorized: only the issuer can revoke access" },
    { "code": 6009, "name": "unauthorizedGrantor", "msg": "Unauthorized: cannot grant access" },
    { "code": 6010, "name": "delegationNotAllowed", "msg": "Delegation is not allowed for this grant" },
    { "code": 6011, "name": "invalidMetadataLength", "msg": "Invalid metadata length" },
    { "code": 6012, "name": "invalidKeyShareLength", "msg": "Invalid key share length" },
    { "code": 6013, "name": "invalidEncryptionKey", "msg": "Invalid encryption key" },
    { "code": 6014, "name": "assetAlreadyExists", "msg": "Asset already exists" },
    { "code": 6015, "name": "grantAlreadyExists", "msg": "Access grant already exists" },
    { "code": 6016, "name": "invalidGrant", "msg": "Invalid access grant" },
    { "code": 6017, "name": "cannotEscalateAccess", "msg": "Cannot escalate access level" },
    { "code": 6018, "name": "invalidExpiration", "msg": "Invalid expiration time" },
    { "code": 6019, "name": "arithmeticOverflow", "msg": "Arithmetic overflow" }
  ],
  "metadata": {
    "address": "DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam"
  }
};

export const IDL: RwaSecrets = {
  "address": "DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam",
  "version": "0.1.0",
  "name": "rwa_secrets",
  "instructions": [
    {
      "name": "initializeProtocol",
      "discriminator": [188, 233, 252, 106, 134, 146, 202, 91],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [112, 114, 111, 116, 111, 99, 111, 108, 95, 99, 111, 110, 102, 105, 103]
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
          "name": "admin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "registerAsset",
      "discriminator": [21, 80, 155, 149, 117, 207, 235, 16],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolConfig",
          "writable": true
        },
        {
          "name": "asset",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "assetId",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "assetType",
          "type": {
            "defined": {
              "name": "assetType"
            }
          }
        },
        {
          "name": "encryptedMetadata",
          "type": "bytes"
        },
        {
          "name": "issuerEncryptionPubkey",
          "type": {
            "array": ["u8", 32]
          }
        }
      ]
    },
    {
      "name": "grantAccess",
      "discriminator": [66, 88, 87, 113, 39, 22, 27, 165],
      "accounts": [
        {
          "name": "grantor",
          "writable": true,
          "signer": true
        },
        {
          "name": "grantee"
        },
        {
          "name": "asset",
          "writable": true
        },
        {
          "name": "accessGrant",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "accessLevel",
          "type": {
            "defined": {
              "name": "accessLevel"
            }
          }
        },
        {
          "name": "encryptedKeyShare",
          "type": "bytes"
        },
        {
          "name": "expiresAt",
          "type": "i64"
        },
        {
          "name": "canDelegate",
          "type": "bool"
        }
      ]
    },
    {
      "name": "revokeAccess",
      "discriminator": [106, 128, 38, 169, 103, 238, 102, 147],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "asset"
        },
        {
          "name": "accessGrant",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "logAccess",
      "discriminator": [196, 55, 194, 24, 5, 224, 161, 204],
      "accounts": [
        {
          "name": "accessor",
          "writable": true,
          "signer": true
        },
        {
          "name": "asset"
        },
        {
          "name": "accessGrant",
          "optional": true
        },
        {
          "name": "auditLog",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "accessType",
          "type": {
            "defined": {
              "name": "accessType"
            }
          }
        },
        {
          "name": "requestMetadata",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "updateMetadata",
      "discriminator": [170, 182, 43, 239, 97, 78, 225, 186],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true
        },
        {
          "name": "asset",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "newEncryptedMetadata",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "deactivateAsset",
      "discriminator": [253, 61, 105, 242, 213, 181, 171, 120],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true
        },
        {
          "name": "asset",
          "writable": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "protocolConfig",
      "discriminator": [207, 91, 250, 28, 152, 179, 215, 209]
    },
    {
      "name": "rwaAsset",
      "discriminator": [62, 30, 88, 81, 99, 223, 144, 27]
    },
    {
      "name": "accessGrant",
      "discriminator": [167, 55, 184, 237, 74, 242, 0, 109]
    },
    {
      "name": "auditLog",
      "discriminator": [230, 207, 176, 233, 170, 130, 101, 244]
    }
  ],
  "types": [
    {
      "name": "protocolConfig",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "admin", "type": "pubkey" },
          { "name": "assetCount", "type": "u64" },
          { "name": "isPaused", "type": "bool" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "rwaAsset",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "issuer", "type": "pubkey" },
          { "name": "assetId", "type": { "array": ["u8", 32] } },
          { "name": "assetType", "type": { "defined": { "name": "assetType" } } },
          { "name": "encryptedMetadata", "type": "bytes" },
          { "name": "issuerEncryptionPubkey", "type": { "array": ["u8", 32] } },
          { "name": "status", "type": { "defined": { "name": "assetStatus" } } },
          { "name": "createdAt", "type": "i64" },
          { "name": "updatedAt", "type": "i64" },
          { "name": "accessGrantCount", "type": "u32" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "accessGrant",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "asset", "type": "pubkey" },
          { "name": "grantee", "type": "pubkey" },
          { "name": "grantor", "type": "pubkey" },
          { "name": "accessLevel", "type": { "defined": { "name": "accessLevel" } } },
          { "name": "encryptedKeyShare", "type": "bytes" },
          { "name": "grantedAt", "type": "i64" },
          { "name": "expiresAt", "type": "i64" },
          { "name": "canDelegate", "type": "bool" },
          { "name": "isRevoked", "type": "bool" },
          { "name": "revokedAt", "type": "i64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "auditLog",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "asset", "type": "pubkey" },
          { "name": "accessor", "type": "pubkey" },
          { "name": "accessType", "type": { "defined": { "name": "accessType" } } },
          { "name": "timestamp", "type": "i64" },
          { "name": "requestMetadata", "type": "bytes" },
          { "name": "wasGranted", "type": "bool" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "assetType",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "realEstate" },
          { "name": "securities" },
          { "name": "commodities" },
          { "name": "receivables" },
          { "name": "intellectualProperty" },
          { "name": "equipment" },
          { "name": "other" }
        ]
      }
    },
    {
      "name": "assetStatus",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "active" },
          { "name": "inactive" },
          { "name": "frozen" },
          { "name": "transferred" }
        ]
      }
    },
    {
      "name": "accessLevel",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "viewBasic" },
          { "name": "viewFull" },
          { "name": "auditor" },
          { "name": "admin" }
        ]
      }
    },
    {
      "name": "accessType",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "viewBasic" },
          { "name": "viewFull" },
          { "name": "audit" },
          { "name": "transferRequest" },
          { "name": "download" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "protocolPaused", "msg": "Protocol is paused" },
    { "code": 6001, "name": "assetNotActive", "msg": "Asset is not active" },
    { "code": 6002, "name": "assetFrozen", "msg": "Asset is frozen" },
    { "code": 6003, "name": "accessExpired", "msg": "Access grant has expired" },
    { "code": 6004, "name": "accessRevoked", "msg": "Access has been revoked" },
    { "code": 6005, "name": "alreadyRevoked", "msg": "Access is already revoked" },
    { "code": 6006, "name": "insufficientAccessLevel", "msg": "Insufficient access level" },
    { "code": 6007, "name": "unauthorizedIssuer", "msg": "Unauthorized: only the issuer can perform this action" },
    { "code": 6008, "name": "unauthorizedRevoker", "msg": "Unauthorized: only the issuer can revoke access" },
    { "code": 6009, "name": "unauthorizedGrantor", "msg": "Unauthorized: cannot grant access" },
    { "code": 6010, "name": "delegationNotAllowed", "msg": "Delegation is not allowed for this grant" },
    { "code": 6011, "name": "invalidMetadataLength", "msg": "Invalid metadata length" },
    { "code": 6012, "name": "invalidKeyShareLength", "msg": "Invalid key share length" },
    { "code": 6013, "name": "invalidEncryptionKey", "msg": "Invalid encryption key" },
    { "code": 6014, "name": "assetAlreadyExists", "msg": "Asset already exists" },
    { "code": 6015, "name": "grantAlreadyExists", "msg": "Access grant already exists" },
    { "code": 6016, "name": "invalidGrant", "msg": "Invalid access grant" },
    { "code": 6017, "name": "cannotEscalateAccess", "msg": "Cannot escalate access level" },
    { "code": 6018, "name": "invalidExpiration", "msg": "Invalid expiration time" },
    { "code": 6019, "name": "arithmeticOverflow", "msg": "Arithmetic overflow" }
  ],
  "metadata": {
    "address": "DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam"
  }
};
