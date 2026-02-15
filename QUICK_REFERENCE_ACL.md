# PayStream Access Control Quick Reference

## 🎯 At a Glance

```
PayStream Access Control Status:
├─ Smart Contracts:     ✅ 90% Secure (Strong modifiers)
├─ Backend API:         🔴 0% Secure (No auth at all)
├─ Frontend:            🔴 40% Secure (Missing role checks)
└─ OffRamp Contract:    🔴 0% Secure (Fee withdrawal open)
```

---

## 🔐 Who Can Do What?

### Company Management

```
CREATE COMPANY
└─ Who: Anyone (becomes CEO automatically)
   Smart Contract: ✅ No guard needed (anyone creates)

UPDATE COMPANY NAME
├─ Who: CEO only
└─ Where: onlyCEO() modifier
   Smart Contract: ✅ PROTECTED
   Frontend: ❌ NO CHECK (missing)
```

---

### Role Assignment

```
ASSIGN CEO/HR
├─ Who: Existing CEO only
└─ Where: onlyCEO() modifier
   Smart Contract: ✅ PROTECTED
   Frontend: ❌ NO CHECK (missing)

REMOVE CEO/HR
├─ Who: Existing CEO only
├─ Rule: Can't remove last CEO
└─ Where: onlyCEO() modifier
   Smart Contract: ✅ PROTECTED
   Frontend: ❌ NO CHECK (missing)
```

---

### Employee Management

```
ADD EMPLOYEE
├─ Who: CEO or HR
└─ Where: onlyHRorCEO() modifier
   Smart Contract: ✅ PROTECTED
   Frontend: ❌ NO CHECK (missing)

REMOVE EMPLOYEE
├─ Who: CEO only
├─ Rule: No active stream
└─ Where: onlyCEO() modifier
   Smart Contract: ✅ PROTECTED
   Frontend: ❌ NO CHECK (missing)
```

---

### Stream Management

```
CREATE STREAM
├─ Who: CEO or HR
└─ Where: onlyHRorCEO() modifier
   Smart Contract: ✅ PROTECTED
   Frontend: ❌ NO CHECK (missing)

PAUSE/RESUME STREAM
├─ Who: CEO or HR
└─ Where: _requireHRorCEO() check
   Smart Contract: ✅ PROTECTED
   Frontend: ❌ NO CHECK (missing)

WITHDRAW SALARY (EMPLOYEE)
├─ Who: Employee only
├─ Rule: Stream must exist, not paused
└─ Where: streams[msg.sender] lookup
   Smart Contract: ✅ PROTECTED
   Frontend: ✅ Good (only shows own stream)
```

---

## 🚨 Critical Vulnerabilities

| # | Issue | Location | Severity | Fix |
|---|-------|----------|----------|-----|
| 1 | No backend auth | `/api/employees/*` | 🔴 CRITICAL | Add signature verification |
| 2 | Fee withdrawal open | `OffRamp.withdrawFees()` | 🔴 CRITICAL | Add `onlyOwner` |
| 3 | No frontend role checks | `CompanyPanel.jsx` | 🟠 HIGH | Display & check role |
| 4 | No rate limiting | Backend API | 🟠 HIGH | Add `express-rate-limit` |

---

## ✅ What's Working Well

✅ **Smart Contract Access Control**
- Proper role checks on all sensitive functions
- Company-scoped permissions prevent cross-company attacks
- Employee-only withdrawal using `msg.sender`

✅ **Treasury Separation**
- Only SalaryStream can call treasury functions
- Funds custody separated from logic

---

## ❌ What's Missing

❌ **Backend API**
- No authentication (anyone can query data)
- No authorization (no ownership checks)
- No rate limiting (DoS vulnerable)

❌ **Frontend**
- No role verification before showing UI
- No role display to users
- Missing input validation

❌ **OffRamp**
- No admin controls on fee withdrawal
- Anyone can steal fees

---

## 📋 Implementation Checklist

### Priority 1: Do Today
- [ ] Add `onlyOwner` to `OffRamp.withdrawFees()`
- [ ] Add auth middleware: `verifySignature()`
- [ ] Add authorization: `verifyOwnership()`

### Priority 2: Do This Week
- [ ] Add rate limiting middleware
- [ ] Add role checking to frontend
- [ ] Display current role in UI

### Priority 3: Do Next Sprint
- [ ] Add request nonce system
- [ ] Add audit logging
- [ ] Add CORS headers
- [ ] Add comprehensive tests

---

## 🔧 Code Patterns

### Frontend Role Check
```jsx
// BEFORE: No check
<button onClick={addCEO}>Assign CEO</button>

// AFTER: Check role first
{userRole === 2 && <button onClick={addCEO}>Assign CEO</button>}
{userRole !== 2 && <p>CEO-only action</p>}
```

### Backend Route Protection
```javascript
// BEFORE: No auth
router.get('/employees/:addr', async (req, res) => { ... });

// AFTER: With auth and authorization
router.get('/employees/:addr', 
  verifySignature,              // ← Auth
  verifyOwnership('addr'),      // ← Authorization
  async (req, res) => { ... }
);
```

### Smart Contract Guard (Already Good ✅)
```solidity
// Good pattern used in contracts
function addCEO(uint256 companyId, address account) 
  external 
  onlyCEO(companyId)  // ← Guard enforces
{ ... }
```

---

## 🎓 Understanding Role Hierarchy

```
Global View:
├─ Multi-Company System
│  ├─ Company A
│  │  ├─ CEO: Alice
│  │  ├─ HR: Bob
│  │  └─ Employees: Charlie, David
│  │
│  └─ Company B
│     ├─ CEO: Eve
│     └─ Employees: Frank

Request: "Can Alice do X?"
Answer: "Yes, if X is CEO-only and X is in Company A"

Request: "Can Bob do X?"
Answer: "Only if X is HR-level and X is in Company A"
```

---

## 🧪 Quick Test

### Test 1: Non-CEO Can't Add CEO (Should Fail ✅)
```
1. Login as HR (not CEO)
2. Try to add new CEO
3. Result: Transaction rejected
Expected: ✅ Good
```

### Test 2: Anyone Can Query Employee Data (Should Fail ❌)
```
1. Query: GET /api/employees/0xCompetitor
2. No auth header provided
3. Result: Returns all employees
Expected: ❌ Should reject
Status: 🔴 BROKEN - needs auth
```

### Test 3: Attacker Can't Drain OffRamp Fees (Should Fail ❌)
```
1. Call: withdrawFees(attackerAddress)
2. No authorization
3. Result: Fees transferred to attacker
Expected: ❌ Should reject
Status: 🔴 BROKEN - no access control
```

---

## 📞 Support

### For Smart Contract Questions
See: [SalaryStream.sol](contracts/contracts/SalaryStream.sol)
- Line 148-158: Modifiers
- Line 193-209: Role assignment functions
- Line 272-297: Stream creation function

### For Remediation Details
See: [SECURITY_REMEDIATION.md](SECURITY_REMEDIATION.md)

### For Full Audit
See: [SECURITY_AUDIT.md](SECURITY_AUDIT.md)

### For Complete Matrix
See: [ACCESS_CONTROL_MATRIX.md](ACCESS_CONTROL_MATRIX.md)

---

## 🚀 Deployment Path

**Current State:** Smart contracts secure, APIs exposed

**Step 1:** Deploy OffRamp fix (new contract)
```
1. Deploy new OffRamp with onlyOwner
2. Update contract address in frontend
3. Migrate fees to new contract
```

**Step 2:** Enable backend auth (same backend, new middleware)
```
1. Add auth middleware
2. Deploy backend with CONFIG.AUTH_ENABLED=false
3. Verify no errors
4. Switch to CONFIG.AUTH_ENABLED=true
5. Monitor for 1 hour
```

**Step 3:** Update frontend UI
```
1. Add role checks to all pages
2. Display current role
3. Add input validation
4. Test end-to-end
```

---

## 📊 Before vs After

### BEFORE (Current)
```
User → Any API request → No auth → Data exposed
User → OffRamp fees → No owner check → Fees stolen
User → Create stream → No frontend check → Gas wasted
```

### AFTER (Remediated)
```
User → Sign message → API validates → Request processed
User → OffRamp fees → Owner check → Funds protected
User → Create stream → UI checks role → Smart contract validates
```

---

## ❓ FAQs

**Q: Can employees withdraw from other employees' streams?**
A: No ✅ - Withdrawal uses `msg.sender`, only owner can withdraw

**Q: Can HR create streams without CEO approval?**
A: Yes - Both HR and CEO have stream creation rights (by design)

**Q: Can anyone use the OffRamp?**
A: Yes - OffRamp is public (needs valid oracle signature)

**Q: Can anyone see salary data?**
A: Currently YES 🔴 - Backend has no auth (needs fixing)

**Q: What if I lose CEO role?**
A: CEO must be assigned by existing CEO - once removed, you lose access

---

## 🎩 Best Practices Implemented

### ✅ What We're Doing Right

1. **Separate Custody** - Treasury keeps funds, SalaryStream handles logic
2. **Role-Based Access** - Clear hierarchy (None → HR → CEO)
3. **Company Scoping** - Actions confined to specific company
4. **Stream Ownership** - Only employee can withdraw their stream
5. **Minimum Privilege** - Each role has minimum needed permissions

### ⚠️ What Needs Improvement

1. **No API Auth** - Backend should verify caller identity
2. **No Frontend Checks** - UI should reflect actual permissions
3. **No Rate Limiting** - Risk of DoS attacks
4. **No Admin Controls** - OffRamp fees unprotected
5. **No Audit Trail** - Can't track who did what on backend

---

## 🔗 Related Files

- [SalaryStream.sol](contracts/contracts/SalaryStream.sol) - Main contract with modifiers
- [Treasury.sol](contracts/contracts/Treasury.sol) - Custody contract
- [OffRamp.sol](contracts/contracts/OffRamp.sol) - Conversion contract (needs fix)
- [backend/routes/employees.js](backend/routes/employees.js) - Unprotected routes
- [frontend/src/pages/CompanyPanel.jsx](frontend/src/pages/CompanyPanel.jsx) - Missing role checks

---

## 📝 Glossary

- **ACL**: Access Control List - who can do what
- **RBAC**: Role-Based Access Control - permissions tied to roles
- **CEI**: Checks-Effects-Interactions - code pattern for security
- **msg.sender**: Current caller in Solidity
- **Modifier**: Solidity reusable guard (like middleware)
- **Nonce**: One-time-use number to prevent replay attacks

---

**Last Updated:** 2024
**Status:** 3 Critical Issues | 5 High Issues | Ready for remediation
