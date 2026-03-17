# DAO Deployment Notes (Sepolia)

## 1. Environment

Create `smart-contract/.env`:

```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/...
DEPLOYER_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
```

## 2. Install / Compile / Test

```bash
npm install
npm run compile
npm run test
```

## 3. Deploy DAO stack

```bash
npm run deploy:dao:sepolia
```

Deployment writes:

`smart-contract/deployment/dao-sepolia.json`

with:

- `token`
- `treasury`
- `dao`

## 4. Verify contracts on Etherscan

```bash
npm run verify:sepolia -- <TOKEN_ADDRESS> "<OWNER_ADDRESS>"
npm run verify:sepolia -- <TREASURY_ADDRESS> "<DAO_ADDRESS>"
npm run verify:sepolia -- <DAO_ADDRESS> "<TOKEN_ADDRESS>" "<TREASURY_ADDRESS>" "<OWNER_ADDRESS>"
```

## 5. Wire backend + frontend

Backend env:

- `DAO_ENABLED=true`
- `DAO_RPC_URL=<SEPOLIA_RPC_URL>`
- `DAO_TOKEN_ADDRESS=<token>`
- `DAO_GOVERNANCE_ADDRESS=<dao>`
- `DAO_TREASURY_ADDRESS=<treasury>`

Frontend env:

- `VITE_DAO_TOKEN_ADDRESS=<token>`
- `VITE_DAO_GOVERNANCE_ADDRESS=<dao>`
- `VITE_DAO_TREASURY_ADDRESS=<treasury>`
