# OutLayer Web Starter

> ### The simplest way to put blockchain inside a web app.
> Your users sign in with a wallet they already have — or no wallet at all — then move value across chains and call smart contracts on NEAR, with **no seed phrases and no key management on your side.** Signing keys are sealed in a hardware TEE the operator can't read; spending rules are enforced in that TEE before anything is signed; cross-chain deposits, swaps, and withdrawals are **gasless** via NEAR Intents (native contract calls pay their gas from the account's own NEAR — they're real on-chain transactions); and every operation is **one SDK call.**

A complete, minimal Next.js app that shows **how to add blockchain to a web app** — multi-wallet sign-in, gasless cross-chain deposits / swaps / withdrawals, and native smart-contract calls on NEAR — **without your users ever touching a seed phrase or topping up a gas wallet of their own**.

The on-chain action it demonstrates (a smart-contract call against a NEAR pool) is just the *substance* of the example — a real transaction that costs gas. The point of this starter is the **wrapper around it**: sign-in, custody, funding, and the one-line SDK calls that make that substance reachable from a normal web app.

It runs on [**OutLayer**](https://outlayer.fastnear.com) through [`@outlayer/sdk`](https://www.npmjs.com/package/@outlayer/sdk): OutLayer gives each user a NEAR-native account whose signing keys live inside a hardware TEE, and the SDK turns deposits / swaps / withdrawals into one-line calls.

**Powered by OutLayer** · [site](https://outlayer.fastnear.com) · [Agent Custody docs](https://outlayer.fastnear.com/docs/agent-custody)
**SDK** · [`@outlayer/sdk`](https://www.npmjs.com/package/@outlayer/sdk) · [source](https://github.com/out-layer/sdk-js)
**API** · [api-spec](https://github.com/out-layer/api-spec) · [interactive docs](https://api.outlayer.fastnear.com/docs)

---

## What this gives you

A blockchain-backed web app where:

- **Users sign in with a wallet they already have** — Ethereum (MetaMask/Rabby), Solana (Phantom), or NEAR — or paste an API key. No new seed phrase, no extension to ship.
- **Nobody pays gas.** Cross-chain deposits, swaps, and withdrawals settle gaslessly through NEAR Intents + the 1Click solver. Users move value without ever holding a gas token.
- **Signing keys never touch your server or the browser.** Each account's key is generated and used **inside an Intel TDX TEE** (Phala Cloud) — even the OutLayer operator can't extract it.
- **Spending rules are enforced in the TEE.** Limits, allowlists, multisig thresholds, and freeze are checked *before* signing, against an encrypted policy stored on NEAR (configured in the OutLayer dashboard).
- **Your API key stays server-side.** It's minted on the server and kept in a signed cookie; every SDK call runs in an API route, so the key never reaches the client.
- **One integration, many chains.** A single NEAR-native account holds cross-chain value on `intents.near`; deposit from and withdraw to Ethereum, Solana, Base, Arbitrum, and more.

## How OutLayer works (read this first)

Each user gets an OutLayer **account** — NEAR-native, with keys in a TEE. You drive it with an **API key** (a bearer token; in this app it lives server-side in a session). It behaves much like an account on an exchange:

- Cross-chain value is custodied on **`intents.near`** (NEAR Intents). You **deposit** from any chain, **operate** (swap, call contracts, etc.), and **withdraw** to any chain — gaslessly, via the 1Click solver. The account itself never signs native Ethereum/Solana transactions.
- So there are **two places funds live**, and the app shows them separately:
  - **On the NEAR account** — native NEAR (pays gas, usable in smart-contract calls).
  - **In `intents.near`** — wNEAR / USDC / USDT / ETH / SOL (NEP-141 positions for swaps + cross-chain).

> **⚠️ Only send whitelisted Intents assets — anything else is lost permanently.** Deposits/withdrawals only work for assets in the NEAR Intents / 1Click catalog (`GET /wallet/v1/tokens`), on the exact chain a deposit address was issued for. Sending any other token, the wrong chain, or an NFT to a 1Click deposit address is unrecoverable. Deposit addresses are one-time.

## What it demonstrates — each action → the SDK call

This is the useful part: every screen maps to one or two SDK calls.

| In the app | SDK call | What happens |
|---|---|---|
| **Sign in** (ETH / Solana / NEAR wallet, or paste an API key) | `OutlayerClient.register()` (first time) | Mints/loads an OutLayer account; API key stored in the session |
| **Deposit** from another chain | `client.createDepositIntent({ chain, token, amount })` → `client.getDepositStatus(id)` | 1Click returns a one-time address on the source chain; funds bridge into `intents.near` |
| **Deposit from NEAR** | user's own NEAR wallet `ft_transfer_call` → `intents.near` | Move a NEP-141 you already hold on NEAR into intents |
| **Buy NEAR** | `client.swapQuote(...)` → `client.swap({ tokenIn, tokenOut: wNEAR })` | Swap a stable/asset in intents into wNEAR |
| **Unwrap → NEAR** | `client.withdraw({ chain: 'near', token: 'near', to: self })` | `native_withdraw`: unwraps wNEAR and delivers **native NEAR** to the account, gaslessly |
| **Call a smart contract** | `client.call({ receiver_id, method_name, args, deposit })` | Any NEAR contract method from the account — a real on-chain tx that **pays gas from the account's native NEAR** (the demo card calls one; swap in your own) |
| **Withdraw NEAR** (to someone) | `client.transfer({ chain: 'near', receiver_id, amount })` | On-chain transfer of native NEAR from the account |
| **Withdraw a token** (cross-chain) | `client.withdraw({ chain, to, amount, token })` | Gasless 1Click withdrawal to any supported chain |
| **Account → reveal/QR**, **balances** | `client.getAddress`, `client.getBalance` | Read address + per-token balances |
| **Inbox** | `inbox.signIn(…, inbox.walletSigner(client), …)` → `inbox.listTasks` → `inbox.readTask` → `inbox.acknowledge` | Reads what the user's OutLayer agents left them; Got it closes a notice (below) |

End-to-end, the full chain works: **deposit USDC → swap to wNEAR → unwrap to native NEAR → call a contract** (and back out via withdraw).

## The inbox

An OutLayer agent can leave its owner a task — "confirm this email", "give me
your photo" — or a **notice**, which asks nothing: "the email was sent". They
are encrypted to the owner's devices. The Inbox page makes this server one of
them: on the user's click, their custody wallet signs one statement
(`sign-message`, no transaction) that signs a device key in for seven days. The
key stays on the server (`lib/server/inbox.ts`), never in the browser.

- **A notice** is shown with **Got it**, which closes it; the agent reads it
  `done`.
- **A task that asks something** links to the OutLayer dashboard's inbox, where
  it is shown first and approved. This app approves nothing.
- **Notifications.** With `INBOX_PUBLIC_URL` set, "Connect notifications" names
  this app's `/api/inbox/webhook` as the user's one webhook (it replaces any
  other they named; the wallet confirms it). Each delivery is checked against
  `X-Webhook-Signature` with the secret told once at naming, and says who asked
  whom, of what kind and when — never what the task shows; the page reads the
  task. The inbox reaches public HTTPS hosts only: deploy the app, or run a
  tunnel in development. Without it the page reads by itself every fifteen
  seconds.
- A task that arrived before the device was connected is encrypted to the
  user's other devices only, and is listed here as locked.
- A wallet whose policy limits the recipients of `sign_message` must list the
  OutLayer contract (`outlayer.near`, `outlayer.testnet`).

Needs `@outlayer/sdk` with the `inbox` module (0.1.0-alpha.5).

## Run it

```bash
git clone https://github.com/out-layer/web-starter
cd web-starter
cp .env.example .env.local
echo "SESSION_SECRET=$(openssl rand -hex 32)" >> .env.local   # required

npm install
npm run dev   # http://localhost:3000  (mainnet by default)
```

Sign in with a browser wallet (MetaMask/Rabby, Phantom, or a NEAR wallet) — an OutLayer account is minted for you. To do real swaps/withdraws, deposit a little first (Deposit card). NEAR Intents only work on mainnet.

## File map

```
app/
  layout.tsx                  Root layout: theme init + ThemeToggle
  page.tsx                    Sign-in (redirects to /dashboard when authed)
  (app)/                      Authenticated route group
    layout.tsx                Nav + server-side auth guard
    dashboard/page.tsx        The main screen: address, balances + all actions
    account/page.tsx          API-key reveal + QR, identity, sign out
    inbox/page.tsx            The owner's inbox: tasks and notices, Got it, notifications
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
    inbox/session/            POST → connect the inbox (the custody wallet signs a device in)
    inbox/tasks/              GET  → the tasks, read on this server's device, and the deliveries
    inbox/tasks/[id]/acknowledge/  POST → Got it on a notice
    inbox/webhook/            POST ← the inbox's deliveries, checked against their signature
    inbox/webhook/name/       POST → name this app's webhook (the custody wallet confirms)
    staking/                  GET  → available / staked / unstaked / withdrawable
components/
  SignInPanel  Nav  Card  ThemeToggle
  AddressesCard  BalanceCard  DepositCard  SwapCard  StakeCard  WithdrawCard  AccountPanel  InboxPanel
lib/
  server/   (server-only) session · store · verifiers · outlayer (SDK wrapper) · auth-flow · token-icons · inbox
  client/   eth-wallet (EIP-6963) · solana-wallet (Phantom) · near-wallet (@hot-labs/near-connect)
            · message · tokens · format · api (safe fetch) · events (balance refresh bus)
```

## How OutLayer is used (the patterns to copy)

- **The API key never reaches the browser.** It's minted server-side and kept in a signed JWT cookie. Every SDK call runs in an API route via `lib/server/outlayer.ts` (`import 'server-only'`), so the key can't leak even through a bad import.
- **One client per request:** route → `clientForUser(session)` → `new OutlayerClient({ apiKey, network })` → SDK call → JSON. Errors are mapped to HTTP status via `OutlayerError`.
- **Two fund locations, two withdraw paths:** native NEAR (on-account) is sent with `transfer`; intents positions go out gaslessly with `withdraw`. The Balances and Withdraw UIs mirror this split.
- **Cross-chain login:** a verified sign-in address (ETH/SOL/NEAR) maps to one OutLayer account in `lib/server/store.ts`; signing in again with the same wallet returns the same account. (Linking multiple wallets to one user is intentionally out of scope.)
- **Key portability:** the Account page reveals the API key + a QR; another device imports it via "Sign in with API key". Treat the key like a private key — set a policy before holding real value.

## How to fork (for AI agents)

This app is a template. Each piece is small (every file < ~200 lines) and independent.

1. **Swap the store for a DB.** `lib/server/store.ts` is an in-memory map on `globalThis`. Keep its 4 exported functions; back them with Postgres/Redis/etc.
2. **Add a sign-in chain:** new `lib/client/<chain>-wallet.ts` (sign) + `app/api/auth/<chain>/route.ts` (verify) + a button in `SignInPanel.tsx`.
3. **Add an operation:** new `app/api/<op>/route.ts` (session → `clientForUser` → SDK call → JSON, catch `OutlayerError`) + a `<Op>Card.tsx`, then drop it into `app/(app)/dashboard/page.tsx`.
4. **Set a policy before production.** Limits / allowlists / multisig are configured at https://outlayer.fastnear.com/wallet — the SDK enforces them inside the TEE.

## What this app does NOT do (on purpose)

- **Multi-wallet linking** — one verified address = one OutLayer account; we don't link several wallets to one user. (See [`near-fm/web`](https://github.com/zavodil/near-fm) for the `link_wallet` pattern.)
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
| `INBOX_PUBLIC_URL` | (unset) | This app's public HTTPS address, for the inbox's deliveries to `/api/inbox/webhook` |

## License

MIT. Fork, modify, ship.
