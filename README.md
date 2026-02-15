# PayStream — Programmable Payroll Infrastructure on HeLa

> Real-time salary streaming, treasury yield, scheduled bonuses, tax redirection, and OffRamp — 100% on-chain, zero backend.

---

## Overview

PayStream is a full-stack DeFi payroll protocol built on the **HeLa blockchain**. It enables employers to stream salaries per-second to employees using native **HLUSD**, while reserved payroll capital earns deterministic yield and admins can schedule performance bonuses with time-locked unlock mechanics.

**Everything runs on-chain. No backend. No off-chain storage. No manual oracle updates.**

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Per-second salary streaming** | Employees earn HLUSD every second, withdraw any time |
| **Treasury custody** | Employer funds held securely in Treasury contract |
| **Tax redirection** | Automatic percentage-based tax deduction at withdrawal |
| **Yield generation** | 5% APY on reserved payroll capital, claimable by employer |
| **Scheduled bonuses** | Time-locked performance bonuses, auto-included in withdrawals |
| **OffRamp (HLUSD → INR)** | Cryptographically signed exchange rates via CoinGecko |
| **On-chain analytics** | Complete stats (streams, yield, bonuses) queryable without backend |
| **Self-indexing** | All employee/employer data indexed on-chain, gas-free reads |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ Admin Dash   │ │ Employee Dash│ │ Analytics Panel  │  │
│  │ • Treasury   │ │ • StreamCard │ │ • Global Stats   │  │
│  │ • Yield      │ │ • Bonus Vault│ │ • Yield/Bonus    │  │
│  │ • Bonuses    │ │ • OffRamp    │ │ • Animated Cards │  │
│  └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘  │
│         │                │                   │            │
│         └────────────────┼───────────────────┘            │
│                          │ ethers.js v6                   │
└──────────────────────────┼───────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────┐
│                    HeLa Blockchain                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ Treasury.sol │ │SalaryStream  │ │   OffRamp.sol    │  │
│  │ • Deposits   │ │ • Streaming  │ │ • ECDSA Verify   │  │
│  │ • Reserves   │ │ • Tax        │ │ • Conversion     │  │
│  │ • Yield 5%   │ │ • Bonuses    │ │ • Fee 1%         │  │
│  │ • claimYield │ │ • Analytics  │ │ • History        │  │
│  └──────────────┘ └──────────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Yield Model

While employer funds are reserved in Treasury for active salary streams, they earn **deterministic linear yield** at 5% APY.

**Formula:**
```
yield = reserved × annualYieldPercent × elapsed / (100 × SECONDS_PER_YEAR)
```

- Accrues only on `employerReserved` funds
- Fully deterministic — no oracle needed
- Does NOT affect employee salary calculations
- Claimable by employer via `claimYield()`
- Live-updating counter on dashboard (ticks every 100ms)

**View functions:**
- `getAccruedYield(address)` — current unclaimed yield
- `getYieldStats(address)` — reserved, accrued, claimed, rate, lastClaim

---

## Bonus Model

Admins can schedule one-time performance bonuses for employees with future unlock times.

**Lifecycle:**
1. Admin calls `scheduleBonus(employee, amount, unlockTime)` 
2. Funds reserved from employer's Treasury balance immediately
3. Bonus appears as "Locked" with countdown timer
4. When `block.timestamp >= unlockTime`, status becomes "Ready"
5. On next `withdraw()`, all ready bonuses auto-included in gross amount
6. Tax applied uniformly to salary + bonus total

**Security:**
- Funds reserved on scheduling (guaranteed funds)
- Cannot be claimed twice (`claimed` flag)
- Bounded loop in withdraw prevents gas attacks

**View functions:**
- `getEmployeeBonuses(address)` — array of all bonuses
- `getPendingBonusTotal(address)` — total unlocked unclaimed bonus
- `getBonusStats()` — totalScheduled, totalPaid, totalLiability

---

## No Off-chain Dependencies

| Aspect | Implementation |
|--------|---------------|
| Rate calculation | `block.timestamp` based, deterministic |
| Yield | Linear formula, no oracle |
| Indexing | On-chain arrays and mappings |
| Analytics | View functions, gas-free |
| Employee tracking | `allEmployees[]`, `activeEmployees[]` |
| Bonus scheduling | On-chain `Bonus[]` per employee |

---

## Quick Start

### Deploy Contracts
```bash
cd contracts
npm install
cp .env.example .env  # Set PRIVATE_KEY
npx hardhat run scripts/deploy.js --network hela
```

### Run Frontend
```bash
cd frontend
npm install
# Set VITE_TREASURY_CONTRACT, VITE_STREAM_CONTRACT in .env
npm run dev
```

### Run Tests
```bash
cd contracts
npx hardhat test
```

---

## Docker Deployment

For the easiest setup, use Docker to run the entire stack (frontend, backend, MongoDB) with a single command:

```bash
# 1. Copy and configure environment
cp .env.docker.example .env.docker
# Edit .env.docker with your values (MongoDB password, Oracle key, etc.)

# 2. Start all services
docker-compose --env-file .env.docker up -d

# 3. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# MongoDB: localhost:27017
```

### Docker Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# View service status
docker-compose ps
```

or use the Makefile shortcuts:

```bash
make setup    # Setup environment
make up       # Start services
make logs-f   # Follow logs
make down     # Stop services
make rebuild  # Rebuild and restart
```

See [DOCKER_README.md](DOCKER_README.md) for detailed documentation.

---

## Tech Stack

- **Solidity ^0.8.9** — Smart contracts
- **Hardhat** — Development framework
- **React + Vite** — Frontend
- **ethers.js v6** — Blockchain interaction
- **CoinGecko API** — Exchange rates (OffRamp only)
- **OpenZeppelin ECDSA** — Signature verification (OffRamp)
- **HeLa Testnet** — Chain ID 666888

---

## Contract Functions

### Treasury.sol
| Function | Access | Description |
|----------|--------|-------------|
| `deposit()` | Public (payable) | Deposit HLUSD |
| `claimYield()` | Employer | Claim accrued yield |
| `getAccruedYield(addr)` | View | Current yield |
| `getYieldStats(addr)` | View | Complete yield stats |
| `reserveFunds(addr, amt)` | SalaryStream only | Reserve for streams |
| `releaseSalary(addr, to, amt)` | SalaryStream only | Release salary |

### SalaryStream.sol
| Function | Access | Description |
|----------|--------|-------------|
| `createStream(...)` | Admin | Create salary stream |
| `withdraw()` | Employee | Withdraw salary + bonuses |
| `scheduleBonus(emp, amt, time)` | Admin | Schedule bonus |
| `getEmployeeBonuses(addr)` | View | All bonuses |
| `getPendingBonusTotal(addr)` | View | Unlocked unclaimed total |
| `getBonusStats()` | View | Global bonus analytics |
| `getGlobalStats()` | View | Platform-wide metrics |

---

## Dashboard Features

### Employer Dashboard
- Treasury balance management (deposit, reserve, available)
- **Payroll Capital Yield Engine** — animated yield counter, claim button
- **Bonus Scheduler** — form with date/time picker, bonus list per employee
- **Analytics** — animated cards: streams, reserved, paid, yield, bonuses
- **Explanation panels** — collapsible info for judges

### Employee Dashboard
- Real-time earnings ticker (per-second streaming)
- **Performance Bonus Vault** — countdown timers, status badges (Locked/Ready/Claimed)
- Combined withdrawable display (Streamed + Bonus)
- HLUSD → INR OffRamp panel

---

## License

MIT
