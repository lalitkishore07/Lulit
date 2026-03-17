# Lulit

## Folder Structure

```text
backend/
  src/main/java/com/lulit/backend/
    config/
    controller/
    dto/
      auth/
      dao/
      post/
      social/
    entity/
    exception/
    repository/
    security/
    service/
    util/
  src/main/resources/
    application.yml
  .env.example
frontend/
  src/
    assets/
    components/
    context/
    hooks/
    pages/
      DaoDashboardPage.jsx
      DaoCreateProposalPage.jsx
      DaoProposalDetailPage.jsx
    services/
      api.js
      daoChain.js
    utils/
  .env.example
smart-contract/
  contracts/
    LulitGovernanceToken.sol
    LulitDAO.sol
    LulitDAOTreasury.sol
    LulitPostRegistry.sol
  scripts/
    deploy.js
    deploy-dao.js
  test/
    LulitDAO.test.js
  deployment/
    README.md
  hardhat.config.js
  .env.example
```

## Backend Run

1. Copy `backend/.env.example` values into runtime environment.
2. From `backend/`, run `mvn spring-boot:run`.

## Frontend Run

1. Copy `frontend/.env.example` to `.env`.
2. From `frontend/`, run `npm install`.
3. Run `npm run dev`.

## Local DAO Quick Start

From project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-dao.ps1
```

This starts:

- Hardhat node (`8545`)
- DAO contracts deployment on localhost
- Backend (`8080`) with DAO env wired
- Frontend (`5173`) with DAO addresses injected to `frontend/.env`

Stop everything:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-local-dao.ps1
```

## Smart Contract Deploy

1. Copy `smart-contract/.env.example` to `.env`.
2. From `smart-contract/`, run `npm install`.
3. Run `npm run compile`.
4. Run `npm run test`.
5. Run `npm run deploy:dao:sepolia`.

## Deployment Targets

For a production setup that stays online without your laptop running, use the deployment guide in `DEPLOYMENT.md`.

Recommended stack:

1. Frontend:
   - Vercel, Netlify, or Render Static Site
   - set `VITE_API_BASE_URL`
2. Backend:
   - Render, Railway, Fly.io, AWS App Runner, or Cloud Run
   - use `backend/Dockerfile`
   - set env variables from `backend/.env.production.example`
3. AI service:
   - Render, Railway, Fly.io, AWS App Runner, or Cloud Run
   - use `ai-service/Dockerfile`
4. Database:
   - Neon, Supabase Postgres, Render Postgres, Railway Postgres, or RDS
   - set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
5. Mobile app:
   - Expo EAS Build + App Store / Play Store
   - use `mobile-app/eas.json`
   - set env vars from `mobile-app/.env.production.example`
6. DAO:
   - deploy contracts to Sepolia or production chain
   - wire `DAO_*` envs in backend and web/mobile app envs

## Security Notes

- Passwords are hashed using BCrypt.
- Aadhaar full number is never stored.
- Aadhaar hash uses SHA-256, then AES encryption before DB storage.
- Access tokens expire in 15 minutes by default.
- Refresh tokens are rotated and persisted in `sessions`.
- CORS and CSRF handling is configured in security config.

## Real OTP Provider Setup (Email/SMS)

Set these backend env vars:

- `OTP_EMAIL_PROVIDER=resend` for real email OTP delivery.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for Resend.
- `OTP_SMS_PROVIDER=textbelt` for real SMS OTP delivery.
- `TEXTBELT_API_KEY` (`textbelt` free key is highly limited).

Defaults are `console` for both providers, which logs OTP in backend logs.

## Why Real Aadhaar API Is Not Used

Real UIDAI integration requires strict legal onboarding, licensed access, audited infrastructure, and regulated KYC workflows. This product intentionally avoids direct UIDAI API calls and stores only privacy-preserving Aadhaar derivatives.

## DAO Governance Architecture (Text Diagram)

```text
[React Frontend /dao]
   |  (MetaMask + ethers.js)
   |-------------------------------> [LulitDAO.sol]
   |                                  | createProposal / castVote / execute
   |                                  |
   |                                  +----reads----> [LulitGovernanceToken.sol]
   |                                  |               (ERC20Votes snapshots, delegation)
   |                                  |
   |                                  +----owner----> [LulitDAOTreasury.sol]
   |                                                  (ETH vault + release via passed proposal)
   |
   |------REST------> [Spring Backend DAO APIs]
                         | upload metadata JSON
                         +------> [Pinata IPFS]
                         |
                         +------> [JSON-RPC (Sepolia)] for proposal/result/eligibility reads
```

## Smart Contract Flow

1. Proposal metadata is pinned to IPFS (`/api/v1/dao/proposals/metadata`).
2. Frontend hashes CID (keccak256) and creates on-chain proposal.
3. DAO snapshots voting power using:
   - liquid delegated votes (`ERC20Votes.getPastVotes`)
   - staked delegated votes (checkpoint-based)
4. Users vote `For / Against / Abstain` once per proposal.
5. Anti-whale cap limits per-wallet vote share.
6. After voting window closes, proposal finalizes:
   - quorum check
   - majority rule
7. Passed proposals wait for timelock, then execute call target.
8. Treasury release can only happen via executed DAO proposal.

## DAO Whitepaper Summary

Lulit DAO introduces community-owned governance for protocol evolution, moderation accountability, treasury stewardship, and leadership rotation.

- **Token-based governance**: `LUL` represents participation rights.
- **Delegation + staking**: token holders can delegate power or stake for additional governance weight.
- **Snapshot security**: voting power is measured at proposal snapshot block to reduce flash-loan influence.
- **Anti-whale balance**: vote cap prevents single-wallet dominance.
- **Timelocked execution**: passed proposals are delayed before execution for transparent review.
- **On-chain transparency**: proposals, votes, and treasury releases are immutable and auditable.
