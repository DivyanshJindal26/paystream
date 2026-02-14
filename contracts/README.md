# PayStream - Real-Time Salary Streaming on HeLa

> **Hackathon MVP**: Per-second payroll streaming with tax redirection using native HLUSD on HeLa Testnet

## 🎯 Overview

PayStream is a gas-optimized salary streaming protocol that enables **real-time per-second payroll** payments on the HeLa blockchain. Employers can stream salaries to employees continuously using **native HLUSD** (the chain's native asset, like ETH on Ethereum), with automatic tax deductions redirected to a tax vault.

### Key Features

✅ **Per-Second Streaming** - Employees earn salary every second  
✅ **Native HLUSD** - Uses chain's native asset, no ERC20 complexity  
✅ **Gas Optimized** - Dynamic calculations, no continuous storage updates  
✅ **Tax Redirection** - Automatic percentage-based tax deduction  
✅ **Admin Security** - Simple admin-controlled stream management  
✅ **HR Dashboard Ready** - Complete view functions for frontend integration  

## 📋 Technical Specifications

- **Solidity Version**: `^0.8.9` (HeLa requirement)
- **Network**: HeLa Testnet (Chain ID: 666888)
- **Native Asset**: HLUSD (like ETH - uses `msg.value` and `payable`)
- **Architecture**: Separated custody (Treasury) and logic (SalaryStream)
- **EVM Version**: Homestead compatible

## 🏗️ Architecture

### Contracts

1. **Treasury.sol**
   - Holds employer native HLUSD deposits
   - Manages fund reservation and release
   - Provides secure custody layer
   - Uses `payable` functions and native transfers

2. **SalaryStream.sol**
   - Implements per-second streaming logic
   - Handles tax redirection
   - Provides admin-based access control
   - Supports pause/resume/cancel operations

### Streaming Efficiency (Critical for Judging)

Earnings are calculated **dynamically** using `block.timestamp`:

```solidity
effectiveTime = min(block.timestamp, endTime)
elapsed = effectiveTime - startTime
grossEarned = ratePerSecond * elapsed
withdrawable = grossEarned - withdrawn
```

**Benefits:**
- ✅ No rounding drift
- ✅ Constant-time complexity O(1)
- ✅ Minimal gas costs
- ✅ Real-time accuracy
- ✅ No continuous state updates

### Tax Module

Each withdrawal automatically splits payment:

1. Calculate gross withdrawable amount
2. Tax = gross × taxPercent / 100
3. Net = gross - tax
4. Transfer net HLUSD to employee
5. Transfer tax HLUSD to tax vault

## 🚀 Deployment

### Prerequisites

1. Node.js and npm installed
2. Hardhat configured
3. Wallet with **native HLUSD** on HeLa Testnet for:
   - Gas fees
   - Employer deposits
4. Private key in `.env` file

### Installation

```bash
cd contracts
npm install
```

### Configuration

1. Copy environment template:
```bash
cp .env.example .env
```

2. Edit `.env`:
```env
PRIVATE_KEY=your_wallet_private_key_here
TAX_VAULT=0x...  # Optional, defaults to deployer
```

**Note**: No HLUSD token address needed - HLUSD is the native asset!

### Deploy to HeLa Testnet

```bash
npx hardhat run scripts/deploy.js --network hela
```

Deployment saves contract addresses to `deployments/paystream-hela.json`

### Deployment Steps

1. ✅ Deploy Treasury (custody contract)
2. ✅ Deploy SalaryStream (with Treasury + TaxVault addresses)
3. ✅ Link SalaryStream to Treasury
4. ✅ Admin can now deposit and create streams

## 🧪 Testing

Run comprehensive test suite:

```bash
npx hardhat test
```

### Test Coverage

- ✅ Treasury deposit (native HLUSD) and fund management
- ✅ Stream creation and validation
- ✅ Per-second earnings calculation
- ✅ Tax deduction and redirection
- ✅ Withdrawal mechanics with native transfers
- ✅ Admin functions (pause/resume/cancel)
- ✅ Access control security
- ✅ CEI pattern and reentrancy safety
- ✅ Gas optimization verification

## 📖 Usage Guide

### For Employers/HR (Admin)

#### 1. Deposit Native HLUSD to Treasury

```javascript
// Send native HLUSD to treasury
await treasury.deposit({ value: ethers.parseEther("50000") });

// Or send directly to treasury address
await signer.sendTransaction({
  to: treasuryAddress,
  value: ethers.parseEther("50000")
});
```

#### 2. Create Salary Stream

```javascript
await salaryStream.createStream(
  employeeAddress,
  ethers.parseEther("3000"),  // Monthly salary (3000 HLUSD)
  12,                          // Duration (12 months)
  10                           // Tax percent (10%)
);
```

**What happens:**
- Converts monthly salary to per-second rate
- Calculates total: 3000 × 12 = 36,000 HLUSD
- Reserves 36,000 HLUSD in treasury
- Stream starts immediately

#### 3. Manage Streams

```javascript
// Pause stream
await salaryStream.pauseStream(employeeAddress);

// Resume stream
await salaryStream.resumeStream(employeeAddress);

// Cancel stream
await salaryStream.cancelStream(employeeAddress);
```

#### 4. View Stream Data (HR Dashboard)

```javascript
// Get total earned (including withdrawn)
const earned = await salaryStream.getEarned(employeeAddress);

// Get current withdrawable amount
const withdrawable = await salaryStream.getWithdrawable(employeeAddress);

// Get full stream details
const stream = await salaryStream.getStreamDetails(employeeAddress);
console.log(stream.ratePerSecond);  // HLUSD per second
console.log(stream.withdrawn);      // Total already withdrawn
console.log(stream.paused);         // Is paused?
```

### For Employees

#### Withdraw Earned Salary

```javascript
// Withdraw all earned salary (automatically splits tax)
await salaryStream.withdraw();
```

**What happens:**
1. Contract calculates: `earned = ratePerSecond × elapsed time`
2. Subtracts already withdrawn amount
3. Calculates tax: `tax = withdrawable × taxPercent / 100`
4. Transfers net HLUSD to employee
5. Transfers tax HLUSD to tax vault
6. Updates withdrawn balance

**Example:**
- Earned: 3000 HLUSD
- Tax (10%): 300 HLUSD
- Employee receives: 2700 HLUSD (net)
- Tax vault receives: 300 HLUSD

## 🔐 Security Features

### Access Control

- **Admin**: Can create, pause, resume, cancel streams; update tax vault
- **Employees**: Can only withdraw from their own stream
- **Treasury**: Only accepts calls from authorized SalaryStream contract

### Security Patterns

- ✅ Checks-Effects-Interactions (CEI) pattern
- ✅ State updates before external transfers
- ✅ Native HLUSD transfers (no approval vulnerabilities)
- ✅ Immutable critical addresses (treasury)
- ✅ One-time SalaryStream linking in Treasury
- ✅ No reentrancy vulnerabilities

## ⚡ Gas Optimization

### Techniques Used

1. **Dynamic Calculations** - No storage of continuously changing balances
2. **Immutable Variables** - Treasury address immutable
3. **No Loops** - All operations O(1) constant time
4. **Minimal Storage** - Only essential state variables
5. **Native Transfers** - No ERC20 overhead
6. **Efficient Events** - Indexed parameters for filtering

### Approximate Gas Costs

| Operation | Estimated Gas |
|-----------|---------------|
| Deposit HLUSD | ~50k |
| Create Stream | ~150k |
| Withdraw | ~80-100k |
| Pause/Resume | ~30-50k |
| Cancel Stream | ~50-70k |

## 📊 Example Deployment Output

```
========================================
PayStream Deployment on HeLa Testnet
========================================

Deploying contracts with account: 0x1234...
Account balance: 100.0 HLUSD

Configuration:
- Network: HeLa Testnet
- Chain ID: 666888
- Tax Vault: 0x5678...
- Native Asset: HLUSD (like ETH)

📦 Step 1: Deploying Treasury contract...
✅ Treasury deployed to: 0xABCD...

📦 Step 2: Deploying SalaryStream contract...
✅ SalaryStream deployed to: 0xEF12...

🔗 Step 3: Linking SalaryStream to Treasury...
✅ SalaryStream linked to Treasury

========================================
🎉 PayStream Deployment Complete!
========================================

📋 Contract Addresses:
┌─────────────────────────────────────────┐
│ Treasury:     0xABCD...                 │
│ SalaryStream: 0xEF12...                 │
│ Tax Vault:    0x5678...                 │
│ Admin:        0x1234...                 │
└─────────────────────────────────────────┘
```

## 🎓 Hackathon Alignment

### Evaluation Criteria Met

1. ✅ **Streaming Efficiency**: Per-second calculation, dynamic earnings
2. ✅ **Gas Optimization**: O(1) operations, minimal storage writes
3. ✅ **Security**: Admin access control, CEI pattern, native transfers
4. ✅ **HR Dashboard**: Complete view functions for UI integration
5. ✅ **Employee Portal**: Simple `withdraw()` function
6. ✅ **Tax Logic**: Automatic percentage-based redirection

### Explicitly Out of Scope

- ❌ ERC20 tokens (HLUSD is native)
- ❌ Upgradeable contracts / proxies
- ❌ Intent registry / AI agents
- ❌ Yield farming integration
- ❌ Multisig / governance
- ❌ Complex tax brackets
- ❌ Subscription engine

## 🛠️ Development

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

### Local Development

```bash
# Start local node
npx hardhat node

# In another terminal, deploy locally
npx hardhat run scripts/deploy.js --network localhost
```

### Check Contract Size

```bash
npx hardhat size-contracts
```

## 🤝 Integration Guide

### Frontend Integration

1. **Connect to HeLa Testnet**
   ```javascript
   const provider = new ethers.JsonRpcProvider("https://testnet-rpc.helachain.com");
   const network = {
     chainId: 666888,
     name: "HeLa Testnet"
   };
   ```

2. **Load Contract ABIs**
   - Use compiled artifacts from `artifacts/contracts/`

3. **Key Functions for UI**

   **HR Dashboard:**
   ```javascript
   // Create new stream
   await salaryStream.createStream(employee, monthlySalary, duration, tax);
   
   // Manage streams
   await salaryStream.pauseStream(employee);
   await salaryStream.resumeStream(employee);
   await salaryStream.cancelStream(employee);
   
   // View data
   const earned = await salaryStream.getEarned(employee);
   const withdrawable = await salaryStream.getWithdrawable(employee);
   const stream = await salaryStream.getStreamDetails(employee);
   ```

   **Employee Portal:**
   ```javascript
   // Check balance
   const available = await salaryStream.getWithdrawable(employee);
   
   // Withdraw
   await salaryStream.withdraw();
   ```

4. **Events to Listen**
   ```javascript
   salaryStream.on("StreamCreated", (employer, employee, rate, start, end, tax) => {
     console.log(`New stream for ${employee}`);
   });
   
   salaryStream.on("Withdrawn", (employee, net, tax) => {
     console.log(`Employee withdrew ${net} HLUSD, ${tax} tax paid`);
   });
   ```

## 📝 Smart Contract Functions Reference

### Treasury

```solidity
// Deposit native HLUSD
function deposit() external payable

// View functions
function getAvailableBalance(address employer) external view returns (uint256)
function getTreasuryBalance() external view returns (uint256)
```

### SalaryStream

```solidity
// Admin functions
function createStream(address employee, uint256 monthlySalary, uint256 durationInMonths, uint256 taxPercent) external
function pauseStream(address employee) external
function resumeStream(address employee) external
function cancelStream(address employee) external
function setTaxVault(address newTaxVault) external

// Employee function
function withdraw() external

// View functions
function getEarned(address employee) external view returns (uint256)
function getWithdrawable(address employee) external view returns (uint256)
function getStreamDetails(address employee) external view returns (Stream memory)
function hasStream(address employee) external view returns (bool)
```

## 📄 License

MIT

## 🙏 Acknowledgments

Built for **HeLa Hackathon** - Demonstrating real-time payroll streaming with per-second granularity and tax automation using native HLUSD.

---

## ⚠️ Important Notes

1. **HLUSD is Native**: Like ETH on Ethereum, HLUSD is the chain's native asset
   - Use `msg.value` for deposits
   - Use `payable(address).transfer()` for payments
   - No token approvals needed

2. **Solidity 0.8.9 Only**: HeLa supports up to 0.8.9
   - OpenZeppelin contracts must be compatible
   - No newer language features

3. **Testing**: This is a hackathon MVP
   - Test extensively on HeLa Testnet
   - Conduct audits before production use

4. **Security**: Keep private keys secure
   - Never commit `.env` to version control
   - Use hardware wallets for mainnet

5. **Gas**: Ensure sufficient HLUSD balance
   - For deployment gas fees
   - For employer deposits

For questions or issues, refer to the test suite (`test/PayStream.test.js`) for complete usage examples.
