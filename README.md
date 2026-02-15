# PayStream — Programmable Payroll Infrastructure on HeLa

> Real-time salary streaming, treasury yield, scheduled bonuses, and OffRamp — 100% on-chain.



## Overview

PayStream is a fully on-chain dApp payroll system built specifically on the HeLa blockchain using the HLUSD native Stable Coin. Essentially, it allows CEOs/founders to create a company and subsequently allow the HRs to add employees and allow them to stream salaries per-second to employees using the stable coin. 

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Company Setup** | The founder/CEO can setup a company, assign HRs, deposit funds |
| **Per-second salary streaming** | Employees earn HLUSD every second, withdraw any time |
| **Treasury custody** | Employer funds held securely in Treasury contract |
| **Tax redirection** | Automatic percentage-based tax deduction at withdrawal to the tax vault|
| **Yield generation** | 5% APY on reserved payroll capital, claimable by employer |
| **Scheduled bonuses** | Time-locked performance bonuses, auto-included in withdrawals |
| **OffRamp (HLUSD → INR)** | Cryptographically signed exchange rates via CoinGecko |
| **Custom Oracle Setup** | An in-house oracle for the offramp to convert the rates safely and 100% security |
| **On-chain analytics** | Complete stats (streams, yield, bonuses) queryable without backend |

---

## How everything works


## Quick Start

A detailed setup is available [here](SETUP.md)
### Docker Deployment (if contracts already deployed)

```bash
Step 0: Fork the Repository

Step 1: Clone repository
git clone FORK_URL
cd Krackhack3

Step 2: Configure environment
cp .env.example .env
nano .env  # Add MongoDB URI, Oracle key, contract addresses

Step 3: Deploy
docker compose up -d --build

Access
- Frontend: http://localhost:8351
- Backend: http://localhost:8352
```

### Local Development

```bash
Step 1: Deploy contracts
cd contracts
npm install
cp .env.example .env
nano .env  # Add private key and RPC URL
npx hardhat run scripts/deploy.js --network hela

Step 2: Start backend
cd ../backend
npm install
cp .env.example .env
nano .env
npm start

Step 3: Start frontend
cd ../frontend
npm install
cp .env.example .env
nano .env
npm run dev
```

---

## Tech Stack

- **Smart Contracts**: Solidity ^0.8.9, Hardhat
- **Frontend**: React 19, Vite, ethers.js v6
- **Backend**: Express.js, MongoDB (Atlas) (For logs)
- **Blockchain**: HeLa Testnet (Chain ID: 666888)
- **Deployment**: Docker, Docker Compose
- **APIs**: CoinGecko (exchange rates)

---

## Oracle Setup

PayStream uses a custom oracle for secure OffRamp (HLUSD → INR) conversions.

### Generate Oracle Wallet

```bash
cd contracts
node generate-oracle.js
```

This generates:
- **Oracle Address** (public): Used in contract deployment
- **Oracle Private Key** (secret): Used in backend/frontend for rate signing

### Oracle Configuration

1. **During Contract Deployment**: Set `ORACLE_SIGNER` in `contracts/.env`
2. **For Backend/Frontend**: Set `ORACLE_PRIVATE_KEY` in root `.env`

The oracle:
- Fetches live exchange rates from CoinGecko
- Signs rates cryptographically with ECDSA
- Verifies signatures on-chain in OffRamp contract
- Prevents rate manipulation attacks

**Security**: The oracle private key should be kept secret and only used server-side.

For detailed oracle setup instructions, see [FULL_SETUP_GUIDE.md](FULL_SETUP_GUIDE.md#part-1-oracle-setup-generate-oracle-wallet).

---


## Features
- **Treasury Management**: Deposit HLUSD, track available and reserved funds
- **Yield Generation**: Earn 5% APY on reserved payroll capital
- **Stream Creation**: Set up per-second salary streams for employees
- **Bonus Scheduling**: Schedule performance bonuses with time locks
- **Analytics Dashboard**: View total streams, yield earned, bonuses paid

---
- **Real-time Earnings**: Watch salary accumulate every second
- **Instant Withdrawals**: Withdraw earned salary anytime
- **Bonus Vault**: Track scheduled bonuses with countdown timers
- **Custom Oracle**: To convert the pricing, we have our custom secure oracle to convert HLUSD to INR.
- **OffRamp**: Convert HLUSD to INR via cryptographically verified rates

---
- **Employee Management**: Add/edit employee records
- **Role Assignment**: Set CEO/HR roles
- **System Logs**: Monitor all platform activity
- **Company Updates**: Modify company details

---
