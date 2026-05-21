# OutLayer Example App

A minimal Next.js app showing **multi-wallet login** (Ethereum, Solana, NEAR) and **cross-chain DeFi** (deposit, swap, stake, unstake, withdraw) — all powered by [`@outlayer/sdk`](https://www.npmjs.com/package/@outlayer/sdk).

**Live SDK**: https://www.npmjs.com/package/@outlayer/sdk
**SDK docs**: https://github.com/out-layer/sdk-js

## Why this exists

To show, in the simplest possible code, what you can build on the OutLayer SDK:

1. A user signs in with any chain wallet they have — **Ethereum, Solana, or NEAR**. Each one signs a standard message (EIP-191, Solana `signMessage`, or NEP-413).
2. The backend verifies the signature, mints an OutLayer custody wallet behind the scenes, and stores the API key in a signed session cookie. **The API key never crosses to the client.**
3. A returning user is recognized by whichever chain wallet they sign in with — the external sign-in address maps to the same custody wallet (the "cross-chain identity" primitive). The custody wallet itself is **NEAR-native**: it exposes a NEAR address today; native ETH/SOL/BTC addresses are planned for wallet v1, not yet shipped.
4. From there: deposit instructions, gasless cross-chain swaps via NEAR Intents, native NEAR staking, and gasless cross-chain withdrawals — all moving value through NEAR Intents, not native per-chain signing.

> **⚠️ Only send whitelisted Intents assets — anything else is lost permanently.** Deposits/withdrawals only work for assets in the NEAR Intents / 1Click token catalog (`GET /wallet/v1/tokens`), on the exact chain a deposit address was issued for. Sending any other asset to a deposit address is unrecoverable.

**Total code: ~30 files, every one under 200 lines.** Optimized for AI agents to fork and extend.

## Run it

```bash
git clone https://github.com/out-layer/example-app
cd example-app
cp .env.example .env.local
# Edit .env.local: set SESSION_SECRET to 32+ random bytes
openssl rand -hex 32 | xargs -I{} echo "SESSION_SECRET={}" >> .env.local

npm install
npm run dev
# Open http://localhost:3000
```

## File map

```
outlayer-example-app/
├── app/
│   ├── layout.tsx          Root layout
│   ├── page.tsx            Server-renders SignIn or Dashboard from session
│   ├── globals.css         Tailwind imports
│   └── api/
│       ├── auth/
│       │   ├── ethereum/   EIP-191 verify + sign-in
│       │   ├── solana/     ed25519 verify + sign-in
│       │   └── near/       NEP-413 verify + sign-in
│       ├── session/        GET current user / DELETE = sign out
│       ├── addresses/      GET derived addresses on all chains
│       ├── balance/        GET native NEAR + intents balances
│       ├── deposit-info/   GET incoming-deposit instructions
│       ├── swap/           POST swap (intents)
│       ├── stake/          POST deposit_and_stake
│       ├── unstake/        POST unstake_all
│       └── withdraw/       POST gasless cross-chain withdraw
├── components/
│   ├── SignInPanel.tsx     Three sign-in buttons
│   ├── Dashboard.tsx       Composes panels for the logged-in view
│   ├── Card.tsx            Shared container
│   ├── AddressesCard.tsx   Show cross-chain addresses
│   ├── BalanceCard.tsx     Show native + intents balances
│   ├── DepositCard.tsx     Show bridge URLs + NEAR deposit address
│   ├── SwapCard.tsx        Buy NEAR (USDT → wNEAR)
│   ├── StakeCard.tsx       Stake / unstake with a validator
│   └── WithdrawCard.tsx    Gasless cross-chain withdraw (ETH/SOL)
├── lib/
│   ├── server/             server-only — session, store, verifiers, SDK
│   │   ├── store.ts        In-memory user→wallet map (REPLACE WITH DB)
│   │   ├── session.ts      JWT cookie session
│   │   ├── verifiers.ts    EIP-191 / ed25519 / NEP-413 signature checks
│   │   ├── outlayer.ts     @outlayer/sdk wrapper, server-only
│   │   └── auth-flow.ts    Signed-in-with-address → user (mint if new)
│   └── client/             client-only — wallet adapters, formatting
│       ├── eth-wallet.ts   EIP-6963 discovery + sign
│       ├── solana-wallet.ts Phantom + signMessage
│       ├── near-wallet.ts  @near-wallet-selector + NEP-413
│       ├── message.ts      Build the canonical sign-in message
│       └── format.ts       yoctoNEAR / USDT formatters
└── README.md (this file)
```

## How to fork (for AI agents)

This example is structured so an AI agent can take it as a template:

1. **Replace `lib/server/store.ts`** with a real DB. Keep the four exported function names — that's the only contract.
2. **Add a chain** by creating a new file pair: `lib/client/<chain>-wallet.ts` (signs) + `app/api/auth/<chain>/route.ts` (verifies). Add a button in `SignInPanel.tsx`.
3. **Add an operation** by creating an API route in `app/api/<op>/route.ts` (wrap the SDK call, handle `OutlayerError`) and a `<Op>Card.tsx` component. Plug into `Dashboard.tsx`.
4. **Add a policy** before any production use — the dashboard at https://outlayer.fastnear.com/wallet sets spending limits, allowlists, and multisig. Pass the user's `apiKey` server-side.

### The 5 patterns you'll reuse

- **Sign-in handshake**: build canonical message → wallet signs → POST `{address, signature, message}` → server verifies + creates session.
- **Server-only SDK use**: `import 'server-only'` in `lib/server/outlayer.ts` blocks accidental client-side imports. The API key cannot leak even with broken imports.
- **API route shape**: every route reads session → builds client → calls SDK → returns JSON. Errors mapped to HTTP status via `OutlayerError`.
- **Card pattern**: each dashboard panel is independent — own fetch, own state, own error UI. Delete or duplicate freely.
- **Cross-chain identity**: an external sign-in address (NEAR / ETH / SOL) maps to the same custody `wallet_id` — look up the same user by any of them. (The custody wallet exposes a NEAR address today; native ETH/SOL/BTC addresses are planned, so `/api/addresses` shows them as "coming soon".)

## What this app does NOT do (intentionally)

- **Multi-wallet linking** — once you sign in via Ethereum, the example doesn't let you also link a Solana wallet to the same user. That flow exists in [`near-fm/web`](https://github.com/zavodil/near-fm) for reference — copy the `action: "link_wallet"` pattern when you need it.
- **Native NEAR balance funding** — the wallet starts empty. Use the deposit panel (or fund directly to its NEAR address) before trying swaps / stakes / withdraws.
- **Policy management** — no UI for setting limits. Visit `https://outlayer.fastnear.com/wallet?key=<api_key>` to configure.
- **Multisig approvals** — if a withdraw triggers the approval threshold, the response will say `pending_approval`. The example logs that but doesn't render an approval UI. See the SDK's [examples/03-multisig.ts](https://github.com/out-layer/sdk-js/blob/main/examples/03-multisig.ts) for the recipe.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `SESSION_SECRET` | (required) | 32+ random bytes for JWT signing. Generate with `openssl rand -hex 32`. |
| `OUTLAYER_BASE_URL` | `https://api.outlayer.fastnear.com` | Override for staging / self-hosted coordinator. |
| `VALIDATOR` | `zavodil.poolv1.near` | Default staking pool used by `/api/stake`. |
| `APP_DOMAIN` | window.location.host | Used in the sign-in message's `domain` field. |

## License

MIT. Fork, modify, ship.
