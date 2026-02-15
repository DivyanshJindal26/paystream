# Security Remediation Implementation Guide

## Quick Reference: Fix Priority

1. ⚠️ **CRITICAL** - Do TODAY:
   - Secure OffRamp fee withdrawal
   - Add backend API authentication

2. 🔴 **HIGH** - Do This Week:
   - Add authorization checks
   - Add frontend role displays

3. 🟡 **MEDIUM** - Do Next Sprint:
   - Rate limiting
   - Better error handling

---

## FIX #1: Secure OffRamp Contract (CRITICAL)

### Problem
`withdrawFees()` has no access control - anyone can drain fees.

### Solution
Add Ownable pattern:

```solidity
// contracts/OffRamp.sol

// Add owner state variable
address public owner;

// Update constructor
constructor(address _oracleSigner) {
    require(_oracleSigner != address(0), "Invalid signer");
    oracleSigner = _oracleSigner;
    owner = msg.sender;  // Add this
}

// Add modifier
modifier onlyOwner() {
    require(msg.sender == owner, "Not authorized");
    _;
}

// Add ownership transfer for safety
function transferOwnership(address newOwner) external onlyOwner {
    require(newOwner != address(0), "Invalid owner");
    address oldOwner = owner;
    owner = newOwner;
    emit OwnershipTransferred(oldOwner, newOwner);
}

// Add event
event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

// SECURE the function
function withdrawFees(address payable recipient) external onlyOwner {
    require(recipient != address(0), "Invalid recipient");
    uint256 amount = totalFeesCollected;
    require(amount > 0, "No fees to withdraw");

    totalFeesCollected = 0;

    (bool success, ) = recipient.call{value: amount}("");
    require(success, "Transfer failed");

    emit FeesWithdrawn(recipient, amount);
}
```

### Deployment
1. Deploy new OffRamp with secured `withdrawFees()`
2. Transfer old OffRamp ownership to deployer
3. Update frontend contract reference
4. Test before production

---

## FIX #2: Add Backend API Authentication (CRITICAL)

### Step 1: Create Auth Middleware

```javascript
// backend/middleware/auth.js
import { ethers } from 'ethers';

/**
 * Verify that request is signed by claimed address
 * Expected headers:
 *   Authorization: "Bearer <address>,<signature>,<message>"
 *   or individual: X-Address, X-Signature, X-Message
 */
export const verifySignature = async (req, res, next) => {
  try {
    // Get signature components from headers
    const auth = req.headers.authorization || '';
    const [address, signature, message] = auth.split(',') || [];
    
    if (!address || !signature || !message) {
      return res.status(401).json({ 
        error: 'Missing signature credentials',
        required: 'Authorization: Bearer <address>,<signature>,<message>'
      });
    }

    // Verify signature
    const recovered = ethers.verifyMessage(
      message,
      signature
    );

    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Attach user to request
    req.user = address.toLowerCase();
    req.message = message;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Authentication failed: ' + err.message });
  }
};

/**
 * Verify that requester owns the resource they're accessing
 */
export const verifyOwnership = (paramName = 'employerAddress') => {
  return (req, res, next) => {
    const resourceOwner = req.params[paramName]?.toLowerCase();
    
    if (resourceOwner && req.user !== resourceOwner) {
      return res.status(403).json({ 
        error: 'Unauthorized - you can only access your own data',
        requested: resourceOwner,
        yourAddress: req.user
      });
    }
    
    next();
  };
};

export default verifySignature;
```

### Step 2: Update Employee Routes with Auth

```javascript
// backend/routes/employees.js
import express from 'express';
import { body, param, validationResult } from 'express-validator';
import Employee from '../models/Employee.js';
import LoggerService from '../services/loggerService.js';
import verifySignature, { verifyOwnership } from '../middleware/auth.js';

const router = express.Router();

// Apply auth to all routes
router.use(verifySignature);

const validateAddress = (field) => 
  body(field)
    .isString()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get all employees for an employer
router.get(
  '/:employerAddress', 
  verifyOwnership('employerAddress'),  // NEW: Verify ownership
  async (req, res) => {
    try {
      const { employerAddress } = req.params;
      const employees = await Employee.find({ 
        employerAddress: employerAddress.toLowerCase() 
      }).sort({ addedAt: -1 });
      
      await LoggerService.logDatabase({
        level: 'info',
        operation: 'find',
        collection: 'employees',
        message: `Retrieved ${employees.length} employees`,
        userAddress: req.user,  // Use authenticated user
        details: { count: employees.length },
      });
      
      res.json({
        success: true,
        count: employees.length,
        employees,
      });
    } catch (error) {
      console.error('Get employees error:', error);
      await LoggerService.logDatabase({
        level: 'error',
        operation: 'find',
        collection: 'employees',
        message: 'Failed to retrieve employees',
        error,
      });
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// Add employee
router.post(
  '/',
  [
    validateAddress('walletAddress'),
    validateAddress('employerAddress'),
    handleValidationErrors,
  ],
  verifyOwnership('employerAddress'),  // NEW: Verify ownership
  async (req, res) => {
    try {
      const { walletAddress, employerAddress, name, email, department, notes, tags } = req.body;

      // Verify that the authenticated user is the employer
      if (req.user !== employerAddress.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: 'You can only add employees to your own company',
        });
      }

      const existing = await Employee.findOne({
        walletAddress: walletAddress.toLowerCase(),
        employerAddress: employerAddress.toLowerCase(),
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Employee already exists',
          employee: existing,
        });
      }

      const employee = new Employee({
        walletAddress: walletAddress.toLowerCase(),
        employerAddress: employerAddress.toLowerCase(),
        name,
        email,
        department,
        notes,
        tags,
      });

      await employee.save();

      await LoggerService.logBusiness({
        level: 'success',
        message: 'Employee added successfully',
        userAddress: req.user,  // Use authenticated user
        employeeAddress: walletAddress,
        details: {
          employeeId: employee._id,
          name,
          department,
        },
        tags: ['employee', 'create'],
      });

      res.status(201).json({
        success: true,
        employee,
      });
    } catch (error) {
      console.error('Add employee error:', error);
      await LoggerService.logBusiness({
        level: 'error',
        message: 'Failed to add employee',
        userAddress: req.user,  // Use authenticated user
        error,
        tags: ['employee', 'create', 'failed'],
      });
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

export default router;
```

### Step 3: Apply Auth to All Routes

```javascript
// backend/server.js (in your main app)
import verifySignature from './middleware/auth.js';
import employeeRoutes from './routes/employees.js';
import streamRoutes from './routes/streams.js';
import logRoutes from './routes/logs.js';

// Apply authentication middleware to ALL API routes
app.use('/api/employees', verifySignature, employeeRoutes);
app.use('/api/streams', verifySignature, streamRoutes);
app.use('/api/logs', verifySignature, logRoutes);

// Public endpoints (no auth needed)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
```

### Step 4: Create Frontend Helper for Signing Requests

```javascript
// frontend/src/services/api.js
import { ethers } from 'ethers';

const API_BASE = 'http://localhost:3000/api';

/**
 * Create signed request headers for API authentication
 */
export async function createAuthHeaders(address, signer) {
  const message = `Sign to authenticate: ${address} at ${Date.now()}`;
  const signature = await signer.signMessage(message);
  
  return {
    Authorization: `Bearer ${address},${signature},${message}`,
  };
}

/**
 * Fetch with automatic signature verification
 */
export async function apiCall(endpoint, options = {}, address, signer) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth headers if signer provided
  if (address && signer) {
    const authHeaders = await createAuthHeaders(address, signer);
    Object.assign(headers, authHeaders);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API error');
  }

  return response.json();
}

// Export helper functions
export const employeeAPI = {
  getAll: async (employerAddress, signer) => 
    apiCall(`/employees/${employerAddress}`, {}, employerAddress, signer),
  
  add: async (employerAddress, data, signer) => 
    apiCall('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    }, employerAddress, signer),
};
```

### Usage in Frontend

```jsx
// frontend/src/pages/AdminDashboard.jsx
import { ethers } from 'ethers';
import { employeeAPI } from '../services/api';

export default function AdminDashboard() {
  const { account, signer, isCorrectNetwork } = useWallet();
  
  const handleLoadEmployees = async () => {
    try {
      const data = await employeeAPI.getAll(account, signer);
      setEmployees(data.employees);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <button onClick={handleLoadEmployees}>Load Employees</button>
      {/* ... */}
    </div>
  );
}
```

---

## FIX #3: Add Frontend Role Display (HIGH)

### Update HRDashboard.jsx

```jsx
// frontend/src/pages/HRDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';

const ROLE_LABELS = {
  0: 'None',
  1: 'HR',
  2: 'CEO'
};

const ROLE_COLORS = {
  0: '#ccc',
  1: '#4CAF50',  // Green
  2: '#FF9800',  // Orange
};

export default function HRDashboard() {
  const { account, contracts } = useWallet();
  const [myCompanies, setMyCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [myRole, setMyRole] = useState(0);
  // ... other states

  useEffect(() => {
    const loadCompanyData = useCallback(async () => {
      if (!contracts.salaryStream || !selectedCompany) return;
      try {
        const role = await contracts.salaryStream.companyRoles(selectedCompany, account);
        setMyRole(Number(role));
        // ... rest of loading
      } catch (e) {
        console.error(e);
      }
    }, [contracts.salaryStream, selectedCompany, account]);
    
    loadCompanyData();
  }, [selectedCompany, account]);

  // NEW: Only show if user has HR or CEO role
  if (myRole === 0) {
    return (
      <div style={{ padding: '20px', background: '#fff3cd', borderRadius: '8px' }}>
        <h3>Access Denied</h3>
        <p>You don't have HR or CEO permissions for this company.</p>
        <p>Your role: <strong>None</strong></p>
      </div>
    );
  }

  return (
    <div>
      {/* NEW: Show current role badge */}
      <div style={{
        padding: '12px',
        background: ROLE_COLORS[myRole],
        color: 'white',
        borderRadius: '4px',
        marginBottom: '20px',
        fontWeight: 'bold'
      }}>
        Your role: {ROLE_LABELS[myRole]}
      </div>

      {/* Show CEO-only controls only if CEO */}
      {myRole === 2 && (
        <div style={{ border: '2px solid #FF9800', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>🔐 CEO Controls</h3>
          {/* CEO functions here */}
        </div>
      )}

      {/* HR functions (available to both HR and CEO) */}
      <div>
        <h3>HR Functions</h3>
        {/* HR functions here */}
      </div>
    </div>
  );
}
```

---

## FIX #4: Add Rate Limiting (HIGH)

### Create Rate Limit Middleware

```javascript
// backend/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';

// General rate limiter - 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for sensitive operations - 10 requests per 15 minutes
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-user rate limiter using address from auth
export const perUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyGenerator: (req, res) => req.user || req.ip, // Use user address or IP
  skip: (req, res) => !req.user, // Skip if no user
});
```

### Apply Rate Limiting to Routes

```javascript
// backend/server.js
import { generalLimiter, strictLimiter, perUserLimiter } from './middleware/rateLimit.js';

// Apply general rate limiter to all API routes
app.use('/api/', generalLimiter);

// Apply stricter limits to sensitive operations
app.post('/api/employees', strictLimiter, verifySignature, ...);
app.post('/api/streams', strictLimiter, verifySignature, ...);

// Apply per-user limits after auth
app.use(verifySignature); // Auth first
app.use(perUserLimiter);  // Then per-user limiting
```

---

## FIX #5: Input Validation in Frontend (MEDIUM)

### Create Validation Helpers

```javascript
// frontend/src/utils/validation.js
export const isValidAddress = (addr) => {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
};

export const isValidAmount = (amount) => {
  try {
    const num = parseFloat(amount);
    return num > 0 && !isNaN(num);
  } catch {
    return false;
  }
};

export const validateForm = (formData, rules) => {
  const errors = {};
  
  for (const [field, validator] of Object.entries(rules)) {
    if (!validator(formData[field])) {
      errors[field] = `Invalid ${field}`;
    }
  }
  
  return errors;
};
```

### Use in Forms

```javascript
// frontend/src/pages/CreateStreamForm.jsx
import { isValidAddress, isValidAmount, validateForm } from '../utils/validation';

export default function CreateStreamForm() {
  const [formData, setFormData] = useState({
    employee: '',
    salary: '',
    duration: '12',
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    const validationRules = {
      employee: isValidAddress,
      salary: isValidAmount,
      duration: (d) => parseInt(d) > 0,
    };
    
    const formErrors = validateForm(formData, validationRules);
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    // Proceed with submission
    await handleCreateStream();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Employee Address</label>
        <input
          type="text"
          value={formData.employee}
          onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
          placeholder="0x..."
        />
        {errors.employee && <p style={{color: 'red'}}>{errors.employee}</p>}
      </div>
      
      <div>
        <label>Monthly Salary (HLUSD)</label>
        <input
          type="number"
          step="0.1"
          value={formData.salary}
          onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
          placeholder="100"
        />
        {errors.salary && <p style={{color: 'red'}}>{errors.salary}</p>}
      </div>
      
      <button type="submit" disabled={Object.keys(errors).length > 0}>
        Create Stream
      </button>
    </form>
  );
}
```

---

## Testing the Fixes

### Test API Authentication

```bash
# Get a signature
ADDRESS="0x..."
MESSAGE="Sign to authenticate"

# Make request with auth header
curl -X GET http://localhost:3000/api/employees/$ADDRESS \
  -H "Authorization: Bearer $ADDRESS,$SIGNATURE,$MESSAGE"
```

### Test Ownership Verification

```bash
# Try to access another user's data (should fail)
curl -X GET http://localhost:3000/api/employees/0xOtherAddress \
  -H "Authorization: Bearer $YOUR_ADDRESS,$SIGNATURE,$MESSAGE"

# Should get 403 Forbidden error
```

### Test Rate Limiting

```bash
# Send 101 requests in quick succession
for i in {1..101}; do
  curl http://localhost:3000/api/employees/$ADDRESS
done

# Request 101 should fail with 429 Too Many Requests
```

---

## Deployment Checklist

- [ ] Test OffRamp contract changes on testnet
- [ ] Deploy new OffRamp to mainnet
- [ ] Test backend auth middleware locally
- [ ] Deploy backend with auth enabled
- [ ] Update frontend with new auth headers
- [ ] Test end-to-end flow
- [ ] Monitor for errors post-deployment
- [ ] Document changes in release notes

---

## Migration Path (Minimal Downtime)

1. Deploy new backend with auth **disabled** (add flag)
2. Update frontend to use new API format
3. Deploy OffRamp contract update
4. Enable auth in backend (monitor logs)
5. Verify no errors for 1 hour
6. Remove auth bypass flag

---

## Questions?

Refer to [SECURITY_AUDIT.md](SECURITY_AUDIT.md) for detailed vulnerability descriptions.
