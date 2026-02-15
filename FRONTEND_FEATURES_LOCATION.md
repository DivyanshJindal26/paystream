# Frontend Features Location Guide

## Where to Find Each Feature

### 🏢 Company Panel (`/company`)
**Purpose**: Multi-company governance and treasury management

**Features Available**:
- ✅ **Create Companies** - Create new company entities
- ✅ **Company Selection** - Switch between your companies
- ✅ **Role Management** - Assign/remove CEO and HR roles
- ✅ **Treasury Deposits** - Deposit HLUSD to company treasury (company-scoped)
- ✅ **Yield Claiming** - Claim 5% APY on reserved capital (company-scoped)
- ✅ **Bonus Scheduling** - Schedule time-locked bonuses for employees (company-scoped)
- ✅ **Company Stats** - View employees, active streams, reserved/paid amounts per company
- ✅ **Update Company** - Modify company name

**Key Implementation**:
```javascript
// Yield claiming (company-scoped)
await treasury.claimYield(companyId)

// Bonus scheduling (automatically uses correct company from employee's stream)
await salaryStream.scheduleBonus(employeeAddr, amount, unlockTimestamp)

// Treasury deposit (company-scoped)
await treasury.deposit(companyId, { value: ethers.parseEther(amount) })
```

---

### 📊 Admin Dashboard (`/admin`)
**Purpose**: Legacy wallet-scoped HR management console

**Features Available**:
- ✅ **Create Streams** - Set up salary streams for employees
- ✅ **Employee Management** - View all employees under your wallet
- ✅ **Global Analytics** - Platform-wide statistics
- ✅ **Employer Stats** - Your wallet's total reserved/paid amounts
- ❌ **Yield Claiming** - DEPRECATED (moved to Company Panel)
- ❌ **Bonus Scheduling** - DEPRECATED (moved to Company Panel)

**Status**: 
- Legacy interface for single-wallet operations
- Yield and Bonus features are now company-scoped in CompanyPanel
- Banner added redirecting users to `/company` for multi-company features

---

### 👤 Employee Dashboard (`/employee`)
**Purpose**: Employee salary management and off-ramping

**Features Available**:
- ✅ **View Stream** - See salary stream details, earnings, withdrawable amount
- ✅ **Withdraw Salary** - Claim earned salary + unlocked bonuses
- ✅ **View Bonuses** - See scheduled and claimed bonuses
- ✅ **OffRamp to INR** - Convert HLUSD → INR using oracle-verified rates
- ✅ **Conversion History** - View past HLUSD→INR conversions
- ✅ **OffRamp Stats** - Total volume, fees, conversion count

**Key Implementation**:
```javascript
// Withdraw salary (includes bonuses if unlocked)
await salaryStream.withdraw()

// OffRamp HLUSD to INR (requires oracle signature)
await offRamp.convertToFiat(
  hlusdAmount,
  expectedInrRate,
  timestamp,
  nonce,
  signature,
  { value: hlusdAmount }
)
```

---

### 👔 HR Dashboard (`/hr`)
**Purpose**: HR-specific company management (role-based access)

**Features**:
- Similar to Admin Dashboard but filtered by HR role permissions
- Can create streams, manage employees within assigned companies

---

### 🌐 Employee Portal (`/employee`)
**Purpose**: Alternative employee interface

**Features**:
- Alternative view of employee dashboard functionality

---

## Feature Matrix

| Feature | Company Panel | Admin Dashboard | Employee Dashboard |
|---------|--------------|-----------------|-------------------|
| **Multi-Company Support** | ✅ Yes | ❌ No (wallet-scoped) | N/A |
| **Create Company** | ✅ Yes | ❌ No | ❌ No |
| **Assign Roles** | ✅ Yes (CEO/HR) | ❌ No | ❌ No |
| **Deposit Treasury** | ✅ Yes (per company) | ❌ Deprecated | ❌ No |
| **Claim Yield** | ✅ Yes (per company) | ❌ Deprecated | ❌ No |
| **Schedule Bonuses** | ✅ Yes | ❌ Deprecated | ❌ No |
| **Create Streams** | ❌ No | ✅ Yes | ❌ No |
| **Withdraw Salary** | ❌ No | ❌ No | ✅ Yes |
| **OffRamp to INR** | ❌ No | ❌ No | ✅ Yes |
| **View Stream** | ❌ No | ❌ No | ✅ Yes |
| **View Bonuses** | ❌ No | ❌ No | ✅ Yes |

---

## Smart Contract Feature Mapping

### Treasury Contract
**Company-Scoped Functions** (require `companyId` parameter):
- `deposit(uint256 companyId)` → **Company Panel**
- `claimYield(uint256 companyId)` → **Company Panel**
- `getAvailableBalance(address, uint256 companyId)` → **Company Panel**
- `getYieldStats(address, uint256 companyId)` → **Company Panel**

### SalaryStream Contract
**Company Governance**:
- `createCompany(string name)` → **Company Panel**
- `addCEO(uint256 companyId, address)` → **Company Panel**
- `addHR(uint256 companyId, address)` → **Company Panel**
- `createStream(uint256 companyId, ...)` → **Admin Dashboard**
- `scheduleBonus(address employee, ...)` → **Company Panel**

**Employee Functions**:
- `withdraw()` → **Employee Dashboard**

### OffRamp Contract
**Conversion Functions**:
- `convertToFiat(...)` → **Employee Dashboard**
- `getUserConversions(address)` → **Employee Dashboard**
- `getStats()` → **Employee Dashboard**

---

## Navigation Flow

### For Employers/CEOs:
1. **Start** → `/company` (Company Panel)
2. **Create company** → Fill company name
3. **Deposit funds** → Add HLUSD to company treasury
4. **Assign roles** → Add CEO/HR members
5. **Create streams** → Go to `/admin` → CreateStreamForm
6. **Claim yield** → Back to `/company` → Yield Dashboard
7. **Schedule bonuses** → In `/company` → Bonus Scheduling

### For Employees:
1. **Start** → `/employee` (Employee Dashboard)
2. **View earnings** → Real-time salary ticker
3. **Withdraw salary** → Claims salary + bonuses
4. **Convert to INR** → OffRamp Panel → Enter amount → Get oracle signature → Convert

---

## Migration Notes

### From Old Treasury (Wallet-Scoped) → New Treasury (Company-Scoped)

**Before** (Broken):
```javascript
// Old AdminDashboard code - NO LONGER WORKS
await treasury.deposit({ value: amount })  // ❌ Missing companyId
await treasury.claimYield()                 // ❌ Missing companyId
await treasury.getAvailableBalance(address) // ❌ Missing companyId
```

**After** (Fixed):
```javascript
// New CompanyPanel code - WORKS
await treasury.deposit(companyId, { value: amount })
await treasury.claimYield(companyId)
await treasury.getAvailableBalance(address, companyId)
```

---

## Component Locations

### Company-Scoped Components
- `frontend/src/pages/CompanyPanel.jsx` - Main multi-company interface
  - Company creation, role management, treasury, yield, bonuses

### Employee Components
- `frontend/src/pages/EmployeeDashboard.jsx` - Employee interface
- `frontend/src/components/OffRampPanel.jsx` - HLUSD → INR conversion

### Legacy Components
- `frontend/src/pages/AdminDashboard.jsx` - Wallet-scoped admin interface
  - Yield/Bonus panels commented out (deprecated)
  - Stream creation still functional

---

## Contract Addresses (HeLa Testnet)

```env
VITE_TREASURY_CONTRACT=0xC6B9dB5a99F21926501A3a52b992692488fB28d7
VITE_STREAM_CONTRACT=0x18453dC8F01fD9f662b98573f0DE1a270817f5bB
VITE_OFFRAMP_CONTRACT=0x561C4f1D1E7472D4C58cb379F8cFA25E064f15Cf
VITE_NETWORK=hela-testnet
VITE_ADMIN_ADDRESS=0x95e38e215CDe9655f6cF5E89E89d00e0BB62144a
```

---

## Summary

**All features are intact and accessible:**

1. ✅ **Bonuses** → Company Panel (`/company`)
2. ✅ **Yield** → Company Panel (`/company`)  
3. ✅ **OffRamp** → Employee Dashboard (`/employee`)

The multi-company treasury fix separated company balances while preserving all functionality. Features just moved to the appropriate company-scoped interface (CompanyPanel) instead of the legacy wallet-scoped interface (AdminDashboard).
