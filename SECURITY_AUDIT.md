# PayStream Security Audit Report

**Date:** 2024  
**Status:** CRITICAL ISSUES IDENTIFIED  
**Project:** PayStream - Multi-Company On-Chain Payroll System

---

## Executive Summary

PayStream implements a multi-company salary streaming system with blockchain-enforced access control. The smart contracts provide **strong access control** through Solidity modifiers, but **critical vulnerabilities exist in the OffRamp contract and backend API**, and **frontend access checks are missing or insufficient**.

**Risk Level: HIGH** - Unauthorized fee withdrawal and unprotected API endpoints pose significant security risks.

---

## 1. CRITICAL VULNERABILITIES

### 1.1 🔴 CRITICAL: Unprotected Fee Withdrawal in OffRamp.sol

**Issue:** The `withdrawFees()` function lacks any access control.

**Location:** [OffRamp.sol](contracts/contracts/OffRamp.sol#L210)

```solidity
function withdrawFees(address payable recipient) external {
    require(recipient != address(0), "Invalid recipient");
    uint256 amount = totalFeesCollected;
    require(amount > 0, "No fees to withdraw");

    totalFeesCollected = 0;

    (bool success, ) = recipient.call{value: amount}("");
    require(success, "Transfer failed");

    emit FeesWithdrawn(recipient, amount);
}
```

**Risk:**
- **Any address** can call this function and drain all collected fees
- Attacker can redirect fees to arbitrary address
- No event logging of who withdrew fees
- Contract comment acknowledges this: "In production, add access control (e.g., Ownable)"

**Impact:** Complete loss of OffRamp fees

**Remediation:**
```solidity
// Add owner/admin access control
modifier onlyOwner() {
    require(msg.sender == owner, "Not authorized");
    _;
}

function withdrawFees(address payable recipient) external onlyOwner {
    // ... existing code
}

// OR whitelist authorized recipients
mapping(address => bool) public authorizedWithdrawals;
function withdrawFees(address payable recipient) external {
    require(authorizedWithdrawals[msg.sender], "Not authorized");
    // ... existing code
}
```

---

### 1.2 🔴 CRITICAL: No Authentication on Backend API

**Issue:** Backend API routes have no authentication or authorization checks.

**Location:** [backend/routes/employees.js](backend/routes/employees.js), [backend/routes/streams.js](backend/routes/streams.js)

**Evidence:**
- GET `/employees/:employerAddress` - Any user can fetch any employer's employees by changing the URL
- GET `/streams/:employerAddress` - Any user can query any employer's streams
- NO JWT tokens, signatures, or authentication middleware
- Backend accepts any employer address in request body without verification

**Example Vulnerability:**
```javascript
// This is OPEN to anyone
router.get('/:employerAddress', async (req, res) => {
  const { employerAddress } = req.params;
  // ⚠️ No check that req.user matches employerAddress
  const employees = await Employee.find({ 
    employerAddress: employerAddress.toLowerCase() 
  });
  res.json({ employees }); // Returns data for ANY employer
});
```

**Attack Scenario:**
1. Attacker queries `/api/employees/0xVictimAddress`
2. Gets complete employee roster with contact info
3. Queries `/api/streams/0xVictimAddress`
4. Gets salary information and stream details
5. Performs social engineering or data aggregation attack

**Impact:** 
- Complete data exposure of all employers and employees
- Privacy breach - salary information accessible to competitors
- Social engineering vulnerability

**Remediation:**

Add authentication middleware:
```javascript
// middleware/auth.js
import express from 'express';
import { ethers } from 'ethers';

const verifySignature = (req, res, next) => {
  const { address, signature, message } = req.headers;
  
  if (!address || !signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  try {
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    req.user = address.toLowerCase();
    next();
  } catch (err) {
    res.status(401).json({ error: 'Signature verification failed' });
  }
};

export default verifySignature;
```

Use in routes:
```javascript
import auth from '../middleware/auth.js';

router.get('/:employerAddress', auth, async (req, res) => {
  // Verify caller is the requested employer
  if (req.user !== req.params.employerAddress.toLowerCase()) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  // ... rest of code
});
```

---

### 1.3 🔴 CRITICAL: No Frontend Role Verification for CompanyPanel

**Issue:** CompanyPanel component doesn't verify CEO role before rendering CEO-only functions.

**Location:** [frontend/src/pages/CompanyPanel.jsx](frontend/src/pages/CompanyPanel.jsx#L172)

**Evidence:**
```jsx
const handleAddRole = async () => {
  if (!selectedCompany || !newRoleAddr) return;
  setLoading(true);
  try {
    const fn = newRoleType === 'CEO' ? 'addCEO' : 'addHR';
    // ⚠️ No check that msg.sender is CEO
    const tx = await contracts.salaryStream[fn](selectedCompany, newRoleAddr);
    // Smart contract will reject, but frontend should prevent attempt
    await tx.wait();
    // ...
  } catch (e) {
    setStatus('Error: ' + (e.reason || e.message));
  }
};
```

**Risk:**
- UI displays CEO functions even if user isn't CEO
- Non-CEOs attempt transactions that will fail on-chain
- Poor UX and potential for confusion
- Blockchain calls waste gas on failed transactions

**Impact:** 
- UX confusion, security by obscurity rather than by design
- Wasted gas fees on failed transactions
- UI doesn't match actual permissions

**Remediation:**

```jsx
const [userRole, setUserRole] = useState(0); // 0=NONE, 1=HR, 2=CEO

useEffect(() => {
  const loadUserRole = async () => {
    if (!selectedCompany || !account) return;
    const role = await contracts.salaryStream.companyRoles(selectedCompany, account);
    setUserRole(Number(role));
  };
  loadUserRole();
}, [selectedCompany, account]);

// Only show CEO controls if user is CEO
{userRole === 2 && (
  <div>
    <h3>CEO Controls</h3>
    <input value={newRoleAddr} onChange={...} />
    <button onClick={handleAddRole} disabled={loading}>
      Assign {newRoleType}
    </button>
  </div>
)}

{userRole === 0 && (
  <p>You must be CEO to access this section.</p>
)}
```

---

## 2. HIGH-SEVERITY ISSUES

### 2.1 🟠 HIGH: Missing Authorization in Backend

**Issue:** Backend logs API accepts any user address without verification.

**Location:** [backend/routes/logs.js](backend/routes/logs.js)

**Risk:**
- Users can log arbitrary events as any address
- Audit trail can be falsified
- No accountability

**Example:**
```javascript
// Anyone can create logs for anyone else
router.post('/', async (req, res) => {
  const { userAddress, message } = req.body;
  // ⚠️ No verification that req.user === userAddress
  const log = await Log.create({ userAddress, message });
  res.json({ log });
});
```

**Remediation:** Add signature verification in all routes that modify data.

---

### 2.2 🟠 HIGH: No Rate Limiting on Backend

**Issue:** Backend endpoints have no rate limiting.

**Risk:**
- DoS attacks possible
- Brute force attacks on employee/stream queries
- Database overload

**Remediation:**
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

router.use(limiter);
```

---

### 2.3 🟠 HIGH: OffRamp Oracle Signature Not Time-Locked Properly

**Issue:** Rate validity window is only 5 minutes - too short for distributed systems.

**Location:** [OffRamp.sol](contracts/contracts/OffRamp.sol#L31)

```solidity
uint256 public constant RATE_VALIDITY_WINDOW = 5 minutes;
```

**Risk:**
- Clock skew in distributed systems can cause valid rates to be rejected
- Oracle can't serve rates reliably during network congestion
- Only 5-minute window for users to execute conversion

**Remediation:**
```solidity
// Increase to 30 minutes or 1 hour
uint256 public constant RATE_VALIDITY_WINDOW = 30 minutes;

// Better: Make it configurable
uint256 public rateValidityWindow = 30 minutes;

function setRateWindow(uint256 newWindow) external onlyOwner {
    require(newWindow > 5 minutes, "Must be at least 5 minutes");
    require(newWindow < 24 hours, "Cannot exceed 24 hours");
    rateValidityWindow = newWindow;
}
```

---

## 3. MEDIUM-SEVERITY ISSUES

### 3.1 🟡 MEDIUM: Frontend Doesn't Display Current User Role

**Issue:** Users don't see their current role in HR/Company dashboards.

**Location:** [frontend/src/pages/HRDashboard.jsx](frontend/src/pages/HRDashboard.jsx#L30)

**Risk:**
- Users confusion about permissions
- Unclear why certain actions are unavailable
- Bad UX

**Remediation:**
```jsx
const ROLE_NAMES = {
  0: 'None',
  1: 'HR',
  2: 'CEO'
};

<div style={{padding: '10px', background: '#f0f0f0', marginBottom: '10px'}}>
  Your role: <strong>{ROLE_NAMES[myRole]}</strong>
</div>
```

---

### 3.2 🟡 MEDIUM: No Input Validation on Frontend

**Issue:** Frontend forms don't validate addresses before sending to contract.

**Location:** [frontend/src/pages/CompanyPanel.jsx](frontend/src/pages/CompanyPanel.jsx#L172)

**Risk:**
- Invalid addresses waste gas
- No helpful error messages to user
- Poor UX

**Remediation:**
```javascript
const isValidAddress = (addr) => {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
};

const handleAddRole = async () => {
  if (!isValidAddress(newRoleAddr)) {
    setStatus('Invalid Ethereum address format');
    return;
  }
  // ... rest of function
};
```

---

### 3.3 🟡 MEDIUM: Insufficient Logging on Smart Contracts

**Issue:** No event logs for role removals or sensitive operations.

**Location:** [SalaryStream.sol](contracts/contracts/SalaryStream.sol#L200-L210)

**Evidence:**
```solidity
function removeCEO(uint256 companyId, address account) external onlyCEO(companyId) {
    require(companyRoles[companyId][account] == Role.CEO, "Not a CEO");
    Role prev = companyRoles[companyId][account];
    companyRoles[companyId][account] = Role.NONE;
    _untrackRoleMember(companyId, account);
    emit RoleRevoked(companyId, account, prev); // ✓ Good
}
```

**Issue:** No sensitive operation audit log for:
- Who removed the role
- When it was removed
- Previous state

**Remediation:**
```solidity
event SensitiveOperation(
    uint256 indexed companyId,
    address indexed actor,
    string operation,
    address indexed target,
    uint256 timestamp
);

function removeCEO(uint256 companyId, address account) external onlyCEO(companyId) {
    require(companyRoles[companyId][account] == Role.CEO, "Not a CEO");
    Role prev = companyRoles[companyId][account];
    companyRoles[companyId][account] = Role.NONE;
    _untrackRoleMember(companyId, account);
    
    emit RoleRevoked(companyId, account, prev);
    emit SensitiveOperation(companyId, msg.sender, "REMOVE_CEO", account, block.timestamp);
}
```

---

## 4. ACCESS CONTROL IMPLEMENTATION SUMMARY

### ✅ WELL-IMPLEMENTED

1. **Smart Contract Role-Based Access Control (RBAC)**
   - CEO role for company creation and user management
   - HR role for employee and stream management
   - Employee role enforced via `msg.sender` check in `withdraw()`
   - Modifiers properly guard all sensitive functions

2. **Company-Scoped Permissions**
   - Access checks tied to specific `companyId`
   - Cannot manage employees in company where you have no role

3. **Treasury Custody Model**
   - Only SalaryStream contract can call `reserveFunds()` and `releaseSalary()`
   - Funds separated from logic for enhanced security

### ❌ MISSING OR WEAK

1. **Backend API Authentication**
   - No requirement to prove identity
   - Any caller can query any employer's data

2. **Frontend Role Display**
   - Users don't see their current permissions
   - Functions available even if user doesn't have required role

3. **OffRamp Admin Access**
   - Fee withdrawal completely unprotected
   - No owner/admin controls

4. **Rate Limiting**
   - No DoS protection on API endpoints
   - Possible to flood database with requests

---

## 5. THREAT MODEL & ATTACK SCENARIOS

### Scenario 1: Malicious Employee Attempts Privilege Escalation
**Attack:** Employee calls `addCEO()` to promote themselves
**Defense:** ✅ Contract has `onlyCEO` modifier - **PROTECTED**
**Outcome:** Transaction rejected on-chain

### Scenario 2: Competitor Steals Salary Data
**Attack:** Request `/api/streams/0xCompetitor` without auth
**Defense:** ❌ No authentication - **VULNERABLE**
**Outcome:** All salary information exposed

### Scenario 3: Attacker Drains OffRamp Fees
**Attack:** Call `withdrawFees(attackerAddress)`
**Defense:** ❌ No access control - **VULNERABLE**
**Outcome:** All accumulated fees stolen

### Scenario 4: Non-CEO Creates Stream
**Attack:** Call `createStream()` from HR account
**Defense:** ✅ Contract has `onlyHRorCEO` modifier - **PROTECTED**
**Outcome:** Transaction succeeds (HR has permission)

### Scenario 5: DoS Attack on Backend
**Attack:** Send 1000 requests/sec to `/api/employees/:addr`
**Defense:** ❌ No rate limiting - **VULNERABLE**
**Outcome:** Database overload, service unavailable

---

## 6. REMEDIATION ROADMAP

### Phase 1: CRITICAL (Do Immediately)
- [ ] Add `onlyOwner` modifier to `OffRamp.withdrawFees()`
- [ ] Add signature verification middleware to backend API
- [ ] Add authorization checks to all backend routes
- [ ] Deploy updated OffRamp contract

### Phase 2: HIGH (Do This Sprint)
- [ ] Add rate limiting to all backend endpoints
- [ ] Add frontend role verification to CompanyPanel
- [ ] Display current user role in all dashboards
- [ ] Add input validation on all forms

### Phase 3: MEDIUM (Next Sprint)
- [ ] Increase OffRamp rate validity window
- [ ] Add comprehensive audit logging
- [ ] Add better error messages to frontend
- [ ] Implement request signing for all API calls

### Phase 4: ENHANCEMENT (Future)
- [ ] Add JWT token support (alternative to signature verification)
- [ ] Implement signature nonce system for replay attack prevention
- [ ] Add comprehensive security headers (CORS, CSP, etc.)
- [ ] Formal security audit by third party

---

## 7. DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] OffRamp contract updated with access control
- [ ] Backend API secured with authentication
- [ ] Frontend role checks implemented
- [ ] Rate limiting configured and tested
- [ ] All private keys secured (never in code/git)
- [ ] Environment variables for contract addresses
- [ ] Error messages don't leak sensitive info
- [ ] CORS properly configured
- [ ] SSL/TLS enabled
- [ ] Database connection string not in code
- [ ] Audit logs enabled
- [ ] Monitoring and alerting setup
- [ ] Backup and disaster recovery plan

---

## 8. COMPLIANCE & DATA PROTECTION

### Privacy Concerns
- Salary information is PII and GDPR-relevant
- Backend currently exposes this without authorization
- Add encryption for data at rest and in transit

### Recommendations
- Implement TLS 1.3 for all connections
- Encrypt sensitive fields in database
- Implement data retention policies
- Log all data access for audit

---

## 9. SMART CONTRACT SECURITY

### Analysis
The SalaryStream and Treasury contracts implement **solid access control patterns**:
- ✅ Clear role definitions
- ✅ Proper modifier guards
- ✅ State validation before operations
- ✅ CEI pattern followed
- ✅ Separate custody contract

### Recommendations
- Consider formal audit before mainnet deploy
- Add emergency pause functionality
- Implement timelock for critical upgrades
- Add comprehensive test coverage

---

## 10. SCORE CARD

| Component | Score | Status |
|-----------|-------|--------|
| Smart Contract RBAC | 9/10 | ✅ Strong |
| Backend Authentication | 1/10 | 🔴 Critical |
| Backend Authorization | 1/10 | 🔴 Critical |
| Frontend Access Checks | 4/10 | 🟠 Weak |
| OffRamp Admin Controls | 0/10 | 🔴 None |
| Rate Limiting | 0/10 | 🔴 None |
| Input Validation | 5/10 | 🟡 Partial |
| Error Handling | 6/10 | 🟡 Partial |
| Audit Logging | 5/10 | 🟡 Partial |
| **OVERALL** | **31/90** | 🔴 **CRITICAL** |

---

## 11. REFERENCES & RESOURCES

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Solidity Security Best Practices](https://docs.soliditylang.org/en/latest/security-considerations.html)
- [ethers.js Documentation](https://docs.ethers.org/v6/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## 12. CONCLUSION

PayStream has **excellent smart contract security** with well-implemented role-based access control. However, the **backend API is critically exposed** with no authentication, and the **OffRamp contract lacks admin controls**. These issues must be addressed before production deployment.

**Priority:** Address all CRITICAL and HIGH issues immediately before mainnet.

---

**Report Generated:** 2024  
**Auditor:** Security Review Team  
**Next Review:** After remediation completion
