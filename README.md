# OutLayer Example App

A small, complete Next.js app that shows how to build on [**OutLayer Agent Custody**](https://outlayer.fastnear.com/docs/agent-custody) with [`@outlayer/sdk`](https://www.npmjs.com/package/@outlayer/sdk): multi-wallet login, cross-chain deposit, swap, unwrap, stake, and withdraw — the whole money-movement lifecycle of a custody wallet.

**SDK:** [`@outlayer/sdk`](https://www.npmjs.com/package/@outlayer/sdk) · [source](https://github.com/out-layer/sdk-js) · **API:** [api-spec](https://github.com/out-layer/api-spec) / [interactive docs](https://api.outlayer.fastnear.com/docs)

---

## The OutLayer model (read this first)

An OutLayer **custody wallet** is like an account on an exchange:

- It is **NEAR-native** — keys live in a TEE, and the wallet has one NEAR account. You drive it with an **API key** (a bearer token; in this app it lives server-side in a session).
- Cross-chain value is custodied on **`intents.near`** (NEAR Intents). You **deposit** from any chain, **operate** (swap, etc.), and **withdraw** to any chain — gaslessly, via the 1Click solver. The wallet itself never signs native Ethereum/Solana transactions.
- So there are **two places funds live**, and the app shows them separately:
  - **On the NEAR account** — native NEAR (pays gas, can be staked).
  - **In `intents.near`** — wNEAR / USDC / USDT / ETH / SOL (NEP-141 positions for swaps + cross-chain).

> **⚠️ Only send whitelisted Intents assets — anything else is lost permanently.** Deposits/withdrawals only work for assets in the NEAR Intents / 1Click catalog (`GET /wallet/v1/tokens`), on the exact chain a deposit address was issued for. Sending any other token, the wrong chain, or an NFT to a 1Click deposit address is unrecoverable. Deposit addresses are one-time.

## What it demonstrates — each action → the SDK call

This is the useful part: every screen maps to one or two SDK calls.

| In the app | SDK call | What happens |
|---|---|---|
| **Sign in** (ETH / Solana / NEAR wallet, or paste an API key) | `OutlayerClient.register()` (first time) | Mints/loads a custody wallet; API key stored in the session |
| **Deposit** from another chain | `client.createDepositIntent({ chain, token, amount })` → `client.getDepositStatus(id)` | 1Click returns a one-time address on the source chain; funds bridge into `intents.near` |
| **Deposit from NEAR** | user's own NEAR wallet `ft_transfer_call` → `intents.near` | Move a NEP-141 you already hold on NEAR into intents |
| **Buy NEAR** | `client.swapQuote(...)` → `client.swap({ tokenIn, tokenOut: wNEAR })` | Swap a stable/asset in intents into wNEAR |
| **Unwrap → NEAR** | `client.withdraw({ chain: 'near', token: 'near', to: self })` | `native_withdraw`: unwraps wNEAR and delivers **native NEAR** to the account, gaslessly |
| **Stake / Unstake / Withdraw** | `client.call({ receiver_id: validator, method_name: 'deposit_and_stake' \| 'unstake_all' \| 'withdraw_all' })` | Native NEAR contract calls against a staking pool |
| **Withdraw NEAR** (to someone) | `client.transfer({ chain: 'near', receiver_id, amount })` | On-chain transfer of native NEAR from the account |
| **Withdraw a token** (cross-chain) | `client.withdraw({ chain, to, amount, token })` | Gasless 1Click withdrawal to any supported chain |
| **Account → reveal/QR**, **balances** | `client.getAddress`, `client.getBalance` | Read address + per-token balances |

End-to-end, the full chain works: **deposit USDC → swap to wNEAR → unwrap to native NEAR → stake** (and back out via withdraw).

## Run it

```bash
git clone https://github.com/out-layer/example-app
cd example-app
cp .env.example .env.local
echo "SESSION_SECRET=$(openssl rand -hex 32)" >> .env.local   # required

npm install
npm run dev   # http://localhost:3000  (mainnet by default)
```

Sign in with a browser wallet (MetaMask/Rabby, Phantom, or a NEAR wallet) — an OutLayer wallet is minted for you. To do real swaps/withdraws, deposit a little first (Deposit card). NEAR Intents only work on mainnet.

## File map

```
app/
  layout.tsx                  Root layout: theme init + ThemeToggle
  page.tsx                    Sign-in (redirects to /wallet when authed)
  (app)/                      Authenticated route group
    layout.tsx                Nav + server-side auth guard
    wallet/page.tsx           The main screen: address, balances + all actions
    account/page.tsx          API-key reveal + QR, identity, sign out
  api/
    auth/{ethereum,solana,near}/  Verify a wallet signature, mint/load wallet, set session
    auth/key/                 Sign in with an existing API key (paste / QR import)
    session/                  GET current user · DELETE = sign out
    account/                  GET wallet info incl. API key (powers reveal/QR)
    addresses/                GET the wallet's NEAR address
    balance/                  GET native NEAR + intents token balances (with logos)
    deposit-intent/           POST → 1Click one-time deposit address (cross-chain in)
    deposit-status/           GET  → poll a deposit intent
    swap/  swap/quote/        POST → swap / quote via NEAR Intents
    transfer/                 POST → native NEAR transfer (on-account)
    withdraw/                 POST → gasless intents withdrawal (native NEAR or token)
    unwrap/                   POST → wNEAR (intents) → native NEAR to self
    stake/ unstake/ withdraw-stake/  POST → validator pool calls
    staking/                  GET  → available / staked / unstaked / withdrawable
components/
  SignInPanel  Nav  Card  ThemeToggle
  AddressesCard  BalanceCard  DepositCard  SwapCard  StakeCard  WithdrawCard  AccountPanel
lib/
  server/   (server-only) session · store · verifiers · outlayer (SDK wrapper) · auth-flow · token-icons
  client/   eth-wallet (EIP-6963) · solana-wallet (Phantom) · near-wallet (@hot-labs/near-connect)
            · message · tokens · format · api (safe fetch) · events (balance refresh bus)
```

## How OutLayer is used (the patterns to copy)

- **The API key never reaches the browser.** It's minted server-side and kept in a signed JWT cookie. Every SDK call runs in an API route via `lib/server/outlayer.ts` (`import 'server-only'`), so the key can't leak even through a bad import.
- **One client per request:** route → `clientForUser(session)` → `new OutlayerClient({ apiKey, network })` → SDK call → JSON. Errors are mapped to HTTP status via `OutlayerError`.
- **Two fund locations, two withdraw paths:** native NEAR (on-account) is sent with `transfer`; intents positions go out gaslessly with `withdraw`. The Balances and Withdraw UIs mirror this split.
- **Cross-chain login:** a verified sign-in address (ETH/SOL/NEAR) maps to one custody wallet in `lib/server/store.ts`; signing in again with the same wallet returns the same custody wallet. (Linking multiple wallets to one user is intentionally out of scope.)
- **Key portability:** the Account page reveals the API key + a QR; another device imports it via "Sign in with API key". Treat the key like a private key — set a policy before holding real value.

## How to fork (for AI agents)

This app is a template. Each piece is small (every file < ~200 lines) and independent.

1. **Swap the store for a DB.** `lib/server/store.ts` is an in-memory map on `globalThis`. Keep its 4 exported functions; back them with Postgres/Redis/etc.
2. **Add a sign-in chain:** new `lib/client/<chain>-wallet.ts` (sign) + `app/api/auth/<chain>/route.ts` (verify) + a button in `SignInPanel.tsx`.
3. **Add an operation:** new `app/api/<op>/route.ts` (session → `clientForUser` → SDK call → JSON, catch `OutlayerError`) + a `<Op>Card.tsx`, then drop it into `app/(app)/wallet/page.tsx`.
4. **Set a policy before production.** Limits / allowlists / multisig are configured at https://outlayer.fastnear.com/wallet — the SDK enforces them inside the TEE.

## What this app does NOT do (on purpose)

- **Multi-wallet linking** — one verified address = one custody wallet; we don't link several wallets to one user. (See [`near-fm/web`](https://github.com/zavodil/near-fm) for the `link_wallet` pattern.)
- **Policy UI** — configure limits/multisig in the OutLayer dashboard, not here.
- **Multisig approval UI** — if a withdrawal exceeds a policy threshold the response is `pending_approval`; the app surfaces it but doesn't render an approval flow. See the SDK's [`examples/03-multisig.ts`](https://github.com/out-layer/sdk-js/blob/main/examples/03-multisig.ts).
- **Persistence across server restarts** — the in-memory store resets on restart; the API key is the durable credential (export it from Account).

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `SESSION_SECRET` | (required) | 32+ random bytes for JWT signing — `openssl rand -hex 32` |
| `NEAR_NETWORK` | `mainnet` | `mainnet` or `testnet` (Intents need mainnet) |
| `NEXT_PUBLIC_NEAR_NETWORK` | `mainnet` | Client-side network for the NEAR wallet connector — keep in sync |
| `OUTLAYER_BASE_URL` | `https://api.outlayer.fastnear.com` | Override for staging / self-hosted coordinator |
| `VALIDATOR` | `zavodil.poolv1.near` | Default staking pool |
| `NEAR_RPC_URL` | `https://rpc.mainnet.fastnear.com` | RPC for token logos + staking views |

## License

MIT. Fork, modify, ship.
