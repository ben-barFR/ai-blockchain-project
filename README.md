# BLDCRT

## Business problem

Paper and email building reports are easy to lose, forge, or present after they expire. Buyers, notaries, public authorities and owners still need to know: *is this file the authentic report for this building, issued by an accredited company, and still valid?*

BLDCRT’s value proposition is a **public, transferable certificate** whose authenticity is a cryptographic hash match against an NFT, not a trusted PDF host.

## Architecture

Four layers:

1. **Clients** — issuer portal, owner portal, public registry, admin/demo
2. **Next.js 15 application** — App Router UI, API route handlers, Supabase session middleware
3. **Intelligence and hashing** — Gemini (document parse + “Ask bldcrt” chat) and client-side `keccak256` of the PDF
4. **Persistence** — Supabase (identity, CRM, private PDFs) and Ethereum Sepolia (`BuildingCertificate`, symbol **BLDCRT**)

The split is deliberate: **private documents stay off-chain**; **identity of the building, issuer, report hash, and validity rules live on-chain**.

```
Issuer / Owner / Registry / Admin
              │
         Next.js App Router
              │
     ┌────────┼────────┐
  Gemini    keccak256   API routes
     │         │            │
     └─────────┼────────────┘
               │
     ┌─────────┴─────────┐
  Supabase           Ethereum Sepolia
  (auth, CRM, PDFs)  (ERC-721 + hashes)
```



## Actors


| Actor             | Surface       | Role                                                                                                      |
| ----------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| Accredited issuer | `/issuer`     | Registers a company, onboards customers, buy and spends issuance credits, mints and transfer certificates |
| Building owner    | `/owner`      | Claims an invite, holds the NFT, downloads the bound PDF                                                  |
| Anyone            | `/registry`   | Looks up a token, verifies a PDF, asks the chatbot                                                        |
| Platform admin    | `/admin`      | Reviews issuers; the contract owner can whitelist issuer wallets                                          |
| Platform minter   | server wallet | Pays gas; in the app it is the only caller of `issueCertificate`                                          |


Roles live in `profiles.user_type` (`issuer`  `owner`  `admin`). Issuers must also be `approved` in Postgres **and** in `approvedIssuers` on the contract.

## Blockchain

`BuildingCertificate.sol` is an OpenZeppelin **ERC-721** (`Ownable`, `ReentrancyGuard`), deployed on **Ethereum Sepolia**:


|          |                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Contract | `[0x9a7D18F33527935BA1130aE61298329d29E46CCB](https://sepolia.etherscan.io/address/0x9a7D18F33527935BA1130aE61298329d29E46CCB)` |
| Network  | Sepolia (`11155111`)                                                                                                            |
| Symbol   | BLDCRT                                                                                                                          |


Each token holds:

- building identity (`buildingId`, `countryCode`, `postalAddress`)
- issuer wallet and identifier (matching the country's company register)
- up to three **components** — electrical, energy, planning — each with `reportHash` (`bytes32`), timestamps, and validity flags

Validity is computed on-chain:

- electrical and energy expire after **five years**
- planning stays valid until `invalidatePlanning`

Transfer is ordinary NFT transfer: ownership moves; hashes and building data stay on the token.

Minting is **platform-controlled**. `issueCertificate` is `onlyOwner`. The Next.js API uses `CERT_MINTER_PRIVATE_KEY` so issuers never sign mint transactions or hold ETH. Accreditation and gas sit with the platform; the NFT still belongs to the owner’s wallet.

Users can use a **generated custodial wallet** stored on their profile, or **link** an external wallet with an EIP-191 signature.

**To do:**
Right now, BLDCRT is the only platform / company that can create certificates on the blockchain with the deployed contract (with symbol BLDCRT). To keep the ecosystem open, we could allow 3rd party platforms to mint certificates using the same contract for a fee. In return they can charge their customers. This way, we keep our hands on the contract, while offering no reason to have a fork and reinforcing the ecosystem.
We would implement the roles with something like OpenZeppelin AccessControl:
grantRole(MINTER_ROLE, platformBWallet) — add a minter
revokeRole(MINTER_ROLE, platformBWallet) — remove one
The admin rol to grant or revoke would stay with bldcrt, but could be moved to a consortium or association at some point, but with protection so that bldcrt never gets removed.

## AI

Gemini 3.6 Flash via the Vercel AI SDK, in two product places:

1. **Structured PDF extraction** — `POST /api/certificates/parse-report` sends the PDF to Gemini with a JSON schema (`buildingId`, `postalAddress`, `countryCode`, `types[]`). Used at issuance and at public verification so nobody has to retype cadastre data.
2. **Ask bldcrt** — `POST /api/registry/chat` is a public explainer. The system prompt includes the live contract address and Etherscan URLs. It has **no tools**: it cannot query the chain or claim it verified a file.

The hash is **not** produced by the model. The browser hashes the exact PDF bytes with viem `keccak256` (`hashFile`).

## How AI and blockchain meet
AI greatly simplifies the digital certificate creation from the PDF that building inspection companies alreaday uses. No data entry, no mistakes. This should make adoption very easy.
It is also a very powerful way to explain the technology behind it to the various level of understandings that visitors may have.

But the crypto is on-chain and with deterministic code. A mismatch, expiry, or `invalidatePlanning` is a fail, regardless of what the model said.


## Off-chain data (Supabase)


| Concern           | Where it lives                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| Identity and role | Auth + `profiles`                                                                                    |
| CRM before mint   | `issuers`, `issuer_customers`, `customer_buildings`                                                  |
| Issuance index    | `certificate_issuances` (`token_id`, `tx_hash`, component flags)                                     |
| Private PDFs      | Storage bucket `certificate-reports` (`{tokenId}/{component}.pdf`), indexed in `certificate_reports` |
| Demo fiat credits | `issuers.issuance_credits` (packs of 100; mint fails with 402 when empty)                            |


PDF download uses signed URLs, only for the token holder or the issuing company.

## End-to-end flows



### Issue

1. Issuer creates a customer record and send a onaboarding email.
2. Customer registers (which creates a wallet, or link an existing one)
3. Approved issuer uploads a PDF.
4. Gemini fills the form (`parse-report`) with the required identifier and postal address
5. The browser computes `keccak256` of the file.
6. `POST /api/certificates/issue` decrements a credit, checks `approvedIssuers`, calls `issueCertificate`, waits for `CertificateIssued`, and writes `certificate_issuances`.
7. The NFT lands on the customer wallet. The PDF is stored in Supabase; the hash is locked on-chain.



### Verify

1. A public visitor uploads a PDF on `/registry/verify` (no login).
2. The same parse + local hash run.
3. `verify-report` finds tokens by building and compares hashes.
4. Lookup by token id is also available on `/registry`.



## Stack


| Layer             | Technology                                          |
| ----------------- | --------------------------------------------------- |
| App               | Next.js 15, React 19, Tailwind 4                    |
| Auth / DB / files | Supabase (Auth, Postgres, Storage)                  |
| AI                | Vercel AI SDK, Gemini 3.6 Flash                     |
| Chain             | Solidity 0.8, OpenZeppelin, Hardhat 3, viem / wagmi |
| Network           | Ethereum Sepolia (`11155111`)                       |


**Why the PDF is not on-chain:** cost and privacy. The chain stores a 32-byte commitment; anyone with the file can reproduce the hash and check it against the NFT without trusting this website.

## Key routes


| Method | Path                              | Purpose                                  |
| ------ | --------------------------------- | ---------------------------------------- |
| `POST` | `/api/certificates/parse-report`  | Gemini PDF extraction                    |
| `POST` | `/api/certificates/issue`         | Credit check + on-chain mint             |
| `POST` | `/api/certificates/verify-report` | Hash match against tokens for a building |
| `POST` | `/api/registry/chat`              | Ask bldcrt (public)                      |




## Local setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with Supabase keys, `GEMINI_API_KEY`, `CERT_MINTER_PRIVATE_KEY`, `ADMIN_EMAILS`, and:


| Variable                           | Example                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_RPC_URL`              | `https://eth-sepolia.g.alchemy.com/v2/alch_LPS4LfWzFEpXaPlnf9Bfu`                                                               |
| `SEPOLIA_RPC_URL`                  | `https://eth-sepolia.g.alchemy.com/v2/alch_LPS4LfWzFEpXaPlnf9Bfu`                                                               |
| `NEXT_PUBLIC_CERTIFICATE_CONTRACT` | `[0x9a7D18F33527935BA1130aE61298329d29E46CCB](https://sepolia.etherscan.io/address/0x9a7D18F33527935BA1130aE61298329d29E46CCB)` |
| `DATABASE_URL`                     | Postgres URI (optional; for schema bootstrap)                                                                                   |


On a **new** Supabase project, create tables / RLS / storage and seed admins:

```bash
npm run init:supabase
```

That applies `supabase/init_schema.sql`, then creates each `ADMIN_EMAILS` Auth user with password `ChangeMe123!` and `user_type: admin`. Use `--admins-only` to skip DDL. Issuer/owner demo accounts still come from `/demo`.

```bash
# Only required if redeploying the contract on a new chain / as a new owner
npm run compile:contracts
npm run deploy:certificate

npm run dev
```

Or start the same server from the IDE **Run and Debug** panel (`.vscode/launch.json`): **Next.js: dev**, or **Next.js: debug full stack** to open Chrome attached for debugging once the app is ready.

Demo accounts: `/demo` — “login as” for issuer / owner / admin for demos.

## Vibe coding process used

I have used the recommended setup with Cursor. I first started with an initial detailed description of the context with the business problem and the concepts, the UI main screens that I had in mind and the user flows I wanteds to see.
Then I started experimenting and drilling into each main flows to refine the processes and data. I also used cusror to get info on some crypto processes, build the contract, how to deploy it.
Finally I conluded with a code review, refactiring and manifest building.
I mostly worked locally, but still checked that the Vercel deployment was working.