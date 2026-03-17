# Lulit Mobile App (Android)

This is a React Native (Expo) Android app scaffold for your existing Lulit backend.

## Included

- Username/password login (`/api/v1/auth/login`)
- Multi-step signup (`/api/v1/auth/signup/*`)
- Token persistence (AsyncStorage)
- Dashboard screen
- Feed screen (`/api/v1/posts/feed`)
- Feed support/challenge actions (`/api/v1/posts/{id}/validate`)
- Create post with media upload (`/api/v1/posts`)
- Profile screen (`/api/v1/profile/me`)
- Settings screen (saved in AsyncStorage)
- DAO proposal list + proposal detail
- Logout (`/api/v1/auth/logout`)

## Run

1. Install dependencies:

```bash
npm install
```

2. Configure API URL:

```bash
cp .env.example .env
```

3. Start Expo:

```bash
npm run start
```

4. Run Android:

```bash
npm run start:android
```

## API base URL notes

- Android emulator: `http://10.0.2.2:8080/api/v1`
- Physical device: use your computer LAN IP, for example `http://192.168.x.x:8080/api/v1`

Set this as:

`EXPO_PUBLIC_API_BASE_URL=...`
`EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=...`

Default local emulator value in this repo:

`EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api/v1`

## DAO Notes (Mobile)

- DAO wallet signing is now integrated through WalletConnect.
- Set `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID` in `.env` (from WalletConnect Cloud / Reown).
- Connect wallet from DAO screens, then create proposals and cast votes in-app.
