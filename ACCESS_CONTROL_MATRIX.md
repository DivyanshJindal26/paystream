# PayStream Access Control Matrix

## Overview

This document defines the complete access control model for PayStream, including:
- Who can perform each action
- Where the check is enforced
- What happens if unauthorized

---

## 1. Role Definitions

| Role | Level | Privileges | Scope |
|------|-------|-----------|-------|
| None | 0 | View own streams only | Global |
| HR | 1 | Manage employees, create streams | Company-scoped |
| CEO | 2 | Full company control, assign roles | Company-scoped |
| Admin | - | System-wide controls | Global |

---

## 2. Company Management

### Create Company
| Property | Value |
|----------|-------|
| Function | `createCompany(string name)` |
| Who Can | Any address |
| Where Checked | Smart contract |
| Enforcement | Creator automatically assigned CEO role |
| Gas Cost | ~100k |

**Result:** New company created, caller becomes CEO

---

### Update Company Name
| Property | Value |
|----------|-------|
| Function | `updateCompanyName(uint256 companyId, string newName)` |
| Who Can | CEO only |
| Where Checked | `onlyCEO()` modifier |
| Enforcement | ❌ No frontend check |
| Gas Cost | ~50k |

**Access Control Flow:**
```
Frontend (no check) → Call Contract → onlyCEO() check → Accept/Reject
```

**Risk:** UI allows anyone to attempt update, wastes gas on failed txs

---

## 3. Role Management

### Add CEO to Company

| Property | Value |
|----------|-------|
| Function | `addCEO(uint256 companyId, address account)` |
| Who Can | CEO only |
| Where Checked | `onlyCEO()` modifier |
| Can Add | Another CEO (yes), Self (yes) |
| Can Remove | Own CEO role (must keep ≥1 CEO) |
| Enforcement | Smart contract ✅ |
| Frontend | ❌ No role check |

**Permissions Matrix:**

```
CALLER ROLE    | Can Add CEO | Can Add HR | Can Remove CEO | Can Remove HR
No Role        | ❌          | ❌        | ❌             | ❌
HR             | ❌          | ❌        | ❌             | ❌
CEO            | ✅          | ✅        | ✅             | ✅
```

**Add CEO Flow:**
1. CEO calls `addCEO(companyId, newAddress)`
2. Smart contract checks: `require(companyRoles[companyId][msg.sender] == Role.CEO)`
3. If not CEO → **Transaction reverted**
4. If CEO → `companyRoles[companyId][newAddress] = Role.CEO`
5. Event emitted: `RoleAssigned(companyId, newAddress, Role.CEO)`

**Risk:** Non-CEO users see UI option, attempt transaction, waste gas

---

### Add HR to Company

| Property | Value |
|----------|-------|
| Function | `addHR(uint256 companyId, address account)` |
| Who Can | CEO only |
| Where Checked | `onlyCEO()` modifier |
| Enforcement | Smart contract ✅ |
| Frontend | ❌ No role check |

Same restriction as Add CEO.

---

### Remove CEO from Company

| Property | Value |
|----------|-------|
| Function | `removeCEO(uint256 companyId, address account)` |
| Who Can | CEO only |
| Special Rule | Cannot remove last CEO (company must have ≥1) |
| Where Checked | `onlyCEO()` modifier |
| Enforcement | Smart contract ✅ |

**Example Scenario:**

```
Company has 2 CEOs: Alice, Bob
Alice calls removeCEO(companyId, Alice)
→ Check: _countCEOs(companyId) > 1 ? Yes (2 CEOs)
→ ✅ Allowed - Alice is removed, Bob remains

Company has 1 CEO: Alice
Alice calls removeCEO(companyId, Alice)
→ Check: _countCEOs(companyId) > 1 ? No (1 CEO)
→ ❌ Rejected - Cannot remove last CEO
```

**Safety Rule:** Prevents company from having zero CEOs

---

### Remove HR from Company

| Property | Value |
|----------|-------|
| Function | `removeHR(uint256 companyId, address account)` |
| Who Can | CEO only |
| Constraint | Target must currently be HR |
| Where Checked | `onlyCEO()` modifier |
| Enforcement | Smart contract ✅ |

---

## 4. Employee Management

### Add Employee to Company

| Property | Value |
|----------|-------|
| Function | `addEmployee(uint256 companyId, address employee)` |
| Who Can | CEO or HR |
| Where Checked | `onlyHRorCEO()` modifier |
| Constraint | Employee cannot already exist in company |
| Enforcement | Smart contract ✅ |
| Frontend | ❌ No role check |

**Permissions:**

```
CALLER ROLE | Can Add Employee
None        | ❌
HR          | ✅
CEO         | ✅
```

**Result:** Employee marked as company employee, eligible for streams

---

### Remove Employee from Company

| Property | Value |
|----------|-------|
| Function | `removeEmployee(uint256 companyId, address employee)` |
| Who Can | CEO only |
| Where Checked | `onlyCEO()` modifier |
| Constraint | No active stream for this company |
| Enforcement | Smart contract ✅ |

**Permissions:**

```
CALLER ROLE | Can Remove
None        | ❌
HR          | ❌
CEO         | ✅
```

**Safety Rule:** Cannot remove employee with active stream (prevents orphaned streams)

---

## 5. Stream Management

### Create Stream

| Property | Value |
|----------|-------|
| Function | `createStream(uint256 companyId, address employee, uint256 monthlySalary, uint256 durationMonths, uint256 taxPercent)` |
| Who Can | CEO or HR |
| Where Checked | `onlyHRorCEO()` modifier |
| Prerequisites | Employee must exist in company |
| Employee Constraints | Cannot have existing stream |
| Amount Constraints | Salary must be > 0, tax ≤ 100% |
| Enforcement | Smart contract ✅ |
| Frontend | ❌ No role check |

**Permissions:**

```
CALLER ROLE | Can Create Stream
None        | ❌
HR          | ✅
CEO         | ✅
```

**Flow:**

1. Caller (HR or CEO) initiates stream creation
2. Frontend does NOT check role (⚠️ missing check)
3. Contract calls `onlyHRorCEO()` modifier
4. If not HR/CEO → **reverted**
5. If valid:
   - Treasury reserves total salary amount
   - Stream created with employer = company creator
   - Employee marked as having active stream

**Risk Scenario:**

```
Employee Account calls createStream()
→ Frontend: No check, displays form ✅
→ Smart Contract: onlyHRorCEO fails
→ Transaction reverted
→ Gas wasted ❌
```

---

### Pause Stream

| Property | Value |
|----------|-------|
| Function | `pauseStream(address employee)` |
| Who Can | CEO or HR of employee's company |
| Where Checked | `_requireHRorCEO()` (internal helper) |
| Enforcement | Smart contract ✅ |

**Effect:** Employee cannot withdraw until resumed

---

### Resume Stream

| Property | Value |
|----------|-------|
| Function | `resumeStream(address employee)` |
| Who Can | CEO or HR of employee's company |
| Where Checked | `_requireHRorCEO()` (internal helper) |
| Enforcement | Smart contract ✅ |

**Effect:** Employee can withdraw again

---

### Cancel Stream

| Property | Value |
|----------|-------|
| Function | `cancelStream(address employee)` |
| Who Can | CEO only |
| Where Checked | `_requireHRorCEO()` (internal helper, but called by CEO) |
| Effect | Terminates stream, refunds unearned salary to company |
| Enforcement | Smart contract ✅ |

---

## 6. Withdrawal Management

### Withdraw Salary (Employee Only)

| Property | Value |
|----------|-------|
| Function | `withdraw()` |
| Who Can | Stream owner (employee) |
| Where Checked | `require(s.employer == ...)` (implicitly, uses streams[msg.sender]) |
| Prerequisites | Must have active stream, stream not paused |
| Enforcement | Smart contract ✅ |

**Access Control:**

```
CALLER             | Can Withdraw
Employee with stream   | ✅ (owns stream)
Employee without stream| ❌ (no stream)
HR/CEO            | ❌ (not stream owner)
```

**Important:** Only `msg.sender` is authorized to withdraw FROM THEIR OWN stream.

**Security:** Employee cannot withdraw for someone else (stream is mapped to msg.sender)

---

## 7. Bonus Management

### Schedule Bonus

| Property | Value |
|----------|-------|
| Function | `scheduleBonus(address employee, uint256 amount, uint256 unlockTime)` |
| Who Can | CEO or HR of employee's company |
| Where Checked | `_requireHRorCEO()` (derived from employee's stream) |
| Constraints | Amount > 0, unlock time > now |
| Enforcement | Smart contract ✅ |

**Permissions:**

```
CALLER ROLE | Can Schedule
None        | ❌
HR          | ✅
CEO         | ✅
Employee    | ❌
```

---

### Claim Bonus (Part of Withdraw)

| Property | Value |
|----------|-------|
| Function | `withdraw()` (includes bonus claiming) |
| Who Can | Stream owner (employee) |
| Constraint | Bonus must be unlocked (time elapsed) |
| Enforcement | Smart contract ✅ |

**Bonus Rules:**

```
Time Now | Bonus Status | Include in Withdraw?
< unlockTime | Locked | ❌ Skipped
≥ unlockTime | Unlocked | ✅ Claimed automatically
```

---

## 8. Yield Management

### Claim Yield

| Property | Value |
|----------|-------|
| Function | `Treasury.claimYield(uint256 companyId)` |
| Who Can | Employer (company creator) |
| Where Checked | `msg.sender` must have made the deposit |
| Calculation | `reserved * annualYieldPercent * elapsed / (100 * SECONDS_PER_YEAR)` |
| Enforcement | Smart contract ✅ |

**Permissions:**

```
CALLER                | Can Claim Yield
Employer of company   | ✅
Employee              | ❌
HR/CEO                | ❌
Other address         | ❌
```

**Note:** Yield is claimed by the employer, not stored per employee

---

## 9. OffRamp (Conversion)

### Convert HLUSD to INR

| Property | Value |
|----------|-------|
| Function | `convertToFiat(uint256 rate, uint256 timestamp, bytes signature)` |
| Who Can | Any address |
| Where Checked | Only ECDSA signature verification |
| Constraints | Valid rate signature from oracle, rate not expired (5 min) |
| Enforcement | Smart contract ✅ |

**Permissions:**

```
CALLER | Can Convert
Anyone | ✅ (sign with valid rate)
```

**Important:** This is PUBLIC - anyone can use OffRamp

---

### Withdraw OffRamp Fees

| Property | Value |
|----------|-------|
| Function | `withdrawFees(address recipient)` |
| Who Can | ANYONE (❌ CRITICAL BUG) |
| Where Checked | None |
| Enforcement | ❌ No access control |

**🔴 SECURITY ISSUE:**

```
CALLER | Can Withdraw Fees
None   | ✅ (BUG - should be onlyOwner)
HR     | ✅ (BUG - should be onlyOwner)
CEO    | ✅ (BUG - should be onlyOwner)
Anyone | ✅ (BUG - should be onlyOwner)
```

**Impact:** Any user can drain all oramp fees to any address

**Status:** See [SECURITY_AUDIT.md](SECURITY_AUDIT.md#11-critical-unprotected-fee-withdrawal-in-oframpsol) for remediation

---

## 10. Backend API Access

### Get Employees

| Endpoint | GET `/api/employees/:employerAddress` |
|----------|----------------------------------------|
| Authentication | ❌ None (BUG) |
| Authorization | ❌ None (BUG) |
| Who Can | Any address (even without signature) |
| Enforcement | None |

**🔴 CRITICAL SECURITY ISSUE:**

```
curl http://localhost:3000/api/employees/0xVictimAddress
→ Returns all employees with salary info for ANY address
```

---

### Create Employee

| Endpoint | POST `/api/employees` |
|----------|----------------------|
| Authentication | ❌ None (BUG) |
| Authorization | ❌ None (BUG) |
| Who Can | Any address |
| Body Fields | `walletAddress`, `employerAddress`, `name`, `email` |
| Enforcement | None |

**🔴 CRITICAL SECURITY ISSUE:**

```
POST /api/employees
{
  "walletAddress": "0x123",
  "employerAddress": "0x456",  // Can be anyone's company
  "name": "Fake Employee"
}
→ Employee created for ANY employer
```

---

### Get Streams

| Endpoint | GET `/api/streams/:employerAddress` |
|----------|-------------------------------------|
| Authentication | ❌ None |
| Authorization | ❌ None |
| Who Can | Any address |
| Enforcement | None |

**🔴 Exposes all stream data (salaries, durations)**

---

## 11. Frontend Access Control Status

| Component | Has Role Check? | Status |
|-----------|-----------------|--------|
| CompanyPanel | ❌ No | 🔴 Missing |
| HRDashboard | ❌ No | 🔴 Missing |
| EmployeeDashboard | ✅ Yes | 🟢 Good |
| CreateStreamForm | ❌ No | 🔴 Missing |

**Backend Compensation:** Smart contracts enforce rules, so frontend checks are secondary but important for UX.

---

## 12. Enforcement Layer Summary

| Layer | Role | Status |
|-------|------|--------|
| Smart Contract | Primary enforcement | 🟢 Strong |
| Backend API | Secondary (missing) | 🔴 None |
| Frontend | UX only | 🟡 Partial |

**Current Architecture:**
```
User Input 
  ↓
Frontend (✅ contracts enforce)
  ↓
Backend (❌ no auth, but only for logging)
  ↓
Smart Contract (✅ final check)
```

**Risk:** Backend is wide open, and smart contract is only safety net.

---

## 13. Attack Scenarios & Mitigations

### Scenario 1: Non-CEO Promotes Themselves

**Attack:**
```
Non-CEO Account → addCEO(companyId, self)
```

**Defense:** ✅ `onlyCEO()` modifier
**Result:** Transaction reverted on-chain

---

### Scenario 2: HR Creates Stream Fraudulently

**Attack:**
```
HR Account → createStream(companyId, attackerAddress, 10000 HLUSD, ...)
```

**Defense:** Employee can't withdraw unless they call withdraw() themselves (msg.sender check)
**Result:** Attacker needs to call withdraw() from target address

---

### Scenario 3: Non-Employee Withdraws Salary

**Attack:**
```
Random Account → withdraw()
```

**Defense:** ✅ Looks up streams[msg.sender] - attacker has no stream
**Result:** `"Stream not found"` error

---

### Scenario 4: Competitor Steals Salary Data

**Attack:**
```
Competitor → GET /api/streams/0xCompanyAddress
```

**Defense:** ❌ No auth middleware
**Result:** ✅ Competitor gets all salary information

**Mitigation Required:** Add signature verification to backend

---

### Scenario 5: Admin Drains OffRamp Fees

**Attack:**
```
Malicious Admin → withdrawFees(attackerAddress)
```

**Defense:** ❌ No access control
**Result:** ✅ All fees stolen

**Mitigation Required:** Add `onlyOwner` modifier

---

## 14. Privilege Escalation Paths

### Path 1: Employee → HR
❌ **Not Possible** - Requires CEO to assign role

### Path 2: HR → CEO
❌ **Not Possible** - Requires CEO to promote (CEO can't promote themselves from HR role)

### Path 3: None → CEO
❌ **Not Possible** - Requires existing CEO

### Path 4: None → CEO (Backend)
✅ **Possible?** Check: Does backend verify user is CEO before logging?
- No signature required on backend logs
- Backend could be spoofed

**Risk:** Backend audit logs could be falsified

---

## 15. Least Privilege Assessment

| Function | Assigned Privilege | Needed | Excess? |
|----------|-------------------|--------|---------|
| createStream | HR or CEO | ✅ | No |
| addEmployee | HR or CEO | ✅ | No |
| addCEO | CEO | ✅ | No |
| removeHR | CEO | ✅ | No |
| withdraw | Not implemented | ✅ | No |

**Overall:** Good least privilege application at contract level. Missing at backend/frontend.

---

## 16. Recommended Minimum Access Control Implementation

### Phase 1: Smart Contracts (Already Done ✅)
- ✅ Role-based modifiers
- ✅ Company-scoped permissions
- ✅ Stream owner checks

### Phase 2: Backend (Critical 🔴)
- ❌ Add signature verification middleware
- ❌ Add ownership validation on all endpoints
- ❌ Add rate limiting

### Phase 3: Frontend (High 🔴)
- ❌ Display user's current role
- ❌ Only show allowed actions for role
- ❌ Validate inputs before submitting

### Phase 4: OffRamp (Critical 🔴)
- ❌ Add owner access control to `withdrawFees()`

---

## 17. Reference Implementation

See [SECURITY_REMEDIATION.md](SECURITY_REMEDIATION.md) for complete code fixes.

---

## Revision History

| Date | Change | Status |
|------|--------|--------|
| 2024 | Initial ACL Review | Complete |
| TBD | Backend Auth Implementation | Pending |
| TBD | Frontend Role Display | Pending |
| TBD | OffRamp Ownership | Pending |

---

## Questions?

- See [SECURITY_AUDIT.md](SECURITY_AUDIT.md) for vulnerabilities
- See [SECURITY_REMEDIATION.md](SECURITY_REMEDIATION.md) for fixes
- Review SalaryStream.sol modifiers: [onlyCEO](contracts/contracts/SalaryStream.sol#L152), [onlyHRorCEO](contracts/contracts/SalaryStream.sol#L157)
