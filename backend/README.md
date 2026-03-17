# Lulit Backend

Default local database is persistent file-based H2 (`./data/lulit`) so data survives backend restarts.

## Environment Variables

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `AES_KEY` (must be 32 chars)
- `JWT_SECRET_BASE64`
- `ACCESS_TOKEN_MINUTES`
- `REFRESH_TOKEN_DAYS`
- `CORS_ORIGIN`
- `COOKIE_SECURE`
- `PINATA_JWT`
- `IPFS_GATEWAY`
- `BLOCKCHAIN_ENABLED`
- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_PRIVATE_KEY`
- `BLOCKCHAIN_CONTRACT_ADDRESS`
- `DAO_ENABLED`
- `DAO_RPC_URL`
- `DAO_TOKEN_ADDRESS`
- `DAO_GOVERNANCE_ADDRESS`
- `DAO_TREASURY_ADDRESS`
- `DAO_IPFS_GATEWAY`
- `SERVER_PORT`

## DAO APIs

- `GET /api/v1/dao/proposals/active`
- `GET /api/v1/dao/proposals/{id}`
- `POST /api/v1/dao/proposals/metadata`
- `GET /api/v1/dao/proposals/{id}/results`
- `GET /api/v1/dao/eligibility/{wallet}`
