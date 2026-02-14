# Treasury Account-Based Deposits Guide

## Understanding How Deposits Work

The Treasury contract tracks deposits **per wallet address** for security and accounting purposes. This is by design and ensures proper financial separation between different employers.

## How It Works

### Deposit Flow
```
1. You connect MetaMask with Account A (0x1234...)
2. You deposit 1000 HLUSD
3. Treasury credits: employerBalances[0x1234...] = 1000 HLUSD
4. Dashboard shows: "Your Total Deposited: 1000 HLUSD"
```

### Viewing Balances
```
✅ CORRECT:
- View dashboard while connected to Account A
- Shows: 1000 HLUSD

❌ COMMON MISTAKE:
- Deposit from Account A
- Switch to Account B in MetaMask
- View dashboard while connected to Account B
- Shows: 0 HLUSD (because Account B has no deposits)
```

## Why You're Seeing Zero Balance

If you deposited funds but see 0 balance in the dashboard, it's because:

1. **You deposited from Account A**
2. **You're viewing the dashboard connected to Account B**
3. The funds ARE in the contract (check "Total Treasury Balance")
4. They're just attributed to Account A, not Account B

## Solution: Match Your Accounts

### Quick Fix
1. Open MetaMask
2. Switch to the account you used to deposit
3. Refresh the dashboard
4. Your balance will now appear

### Visual Guide

**Dashboard Treasury Status Panel Shows:**
- **Your Total Deposited**: Balance for currently connected account
- **Your Reserved**: Funds reserved for streams (current account)
- **Your Available**: Unreserved balance (current account)
- **Total Treasury Balance**: Combined balance of ALL employers ✨

### Example Scenario

```
Account A deposited: 5000 HLUSD
Account B deposited: 3000 HLUSD
Total Treasury: 8000 HLUSD

Dashboard when connected to Account A:
├─ Your Total Deposited: 5000 HLUSD
├─ Your Reserved: 1000 HLUSD
├─ Your Available: 4000 HLUSD
└─ Total Treasury Balance: 8000 HLUSD

Dashboard when connected to Account B:
├─ Your Total Deposited: 3000 HLUSD
├─ Your Reserved: 0 HLUSD
├─ Your Available: 3000 HLUSD
└─ Total Treasury Balance: 8000 HLUSD
```

## Verifying Your Deposit

### Method 1: Check Block Explorer
1. Find your deposit transaction hash
2. Go to: https://testnet-blockexplorer.helachain.com/tx/YOUR_TX_HASH
3. Verify the transaction shows "Success"
4. Confirm the value matches what you deposited

### Method 2: Check Total Treasury Balance
1. Look at "Total Treasury Balance" in the dashboard
2. This shows the combined balance of all employers
3. If this increased by your deposit amount, funds are in the contract

### Method 3: Use Console (Advanced)
```javascript
// Open browser console (F12)
// Get balance for specific account
const balance = await contracts.treasury.employerBalances("0xYourAddress");
console.log("Balance:", ethers.formatEther(balance), "HLUSD");

// Get total treasury balance
const total = await contracts.treasury.getTreasuryBalance();
console.log("Total Treasury:", ethers.formatEther(total), "HLUSD");
```

## Multi-Account Setup

### Scenario: Multiple Team Members
If you have multiple people managing payroll:

**Team Member 1** (0xABC...)
- Deposits 10000 HLUSD
- Can create streams using their 10000 HLUSD balance
- Dashboard shows their individual balance

**Team Member 2** (0xDEF...)
- Deposits 5000 HLUSD
- Can create streams using their 5000 HLUSD balance
- Dashboard shows their individual balance

**Total Treasury**: 15000 HLUSD (viewed by both)

### Scenario: Same Person, Different Accounts
If you accidentally deposited from the wrong account:

#### Option 1: Use the Account That Has Funds
- Switch MetaMask to the account with the deposit
- Create streams from that account
- Everything works normally

#### Option 2: Deposit from Correct Account
- Switch to your preferred account
- Make a new deposit
- Now both accounts have balances

#### Option 3: Request Withdrawal Feature (Future)
- Currently, there's no built-in withdrawal function
- This could be added if needed
- For now, use the funds from the account that deposited them

## Best Practices

### ✅ DO:
- Use one consistent MetaMask account for all admin operations
- Check which account is connected before depositing
- Note down the account address you use for deposits
- Bookmark the account in MetaMask for easy access

### ❌ DON'T:
- Switch accounts randomly while managing payroll
- Deposit from different accounts without keeping track
- Panic if you see 0 balance (check connected account first)
- Create multiple deposits from different accounts unnecessarily

## Troubleshooting Checklist

**"I deposited but see 0 balance"**
- [ ] Check which account is currently connected in MetaMask
- [ ] Compare with the account that made the deposit
- [ ] Switch to the depositing account
- [ ] Refresh the dashboard
- [ ] Check "Total Treasury Balance" confirms funds are in contract

**"I don't remember which account I used"**
- [ ] Check browser history for the transaction
- [ ] Look in MetaMask activity/history
- [ ] Try each account you have and check balance
- [ ] Look at block explorer recent transactions

**"Can I transfer balance between accounts?"**
- Currently: No built-in transfer function
- Workaround: Create streams from the account with funds
- Future: This feature could be added if needed

## Visual Indicators in Dashboard

The updated dashboard now shows:

### 1. Account Info Banner
```
👤 Viewing balance for: 0x1234...5678
💡 Treasury tracks deposits per wallet address. 
   Switch MetaMask accounts to view different balances.
```

### 2. Deposit Panel Notice
```
⚠️ Important: Account-Based Deposits
Deposits are credited to the connected wallet: 0x1234...5678
To view this balance, make sure you're connected to the same account.
```

### 3. Four Balance Metrics
- **Your Total Deposited**: Your account only
- **Your Reserved**: Your account only
- **Your Available**: Your account only
- **Total Treasury Balance**: All accounts combined ⭐

## Technical Explanation

### Smart Contract Code
```solidity
// Each employer has their own balance
mapping(address => uint256) public employerBalances;

// When you deposit
function deposit() external payable {
    employerBalances[msg.sender] += msg.value; // msg.sender = your wallet
}

// When creating streams
function reserveFunds(address employer, uint256 amount) external {
    require(employerBalances[employer] >= amount); // Checks YOUR balance
    employerReserved[employer] += amount;
}
```

### Why This Design?
1. **Security**: Employers can't spend other employers' funds
2. **Accounting**: Clear separation of deposits
3. **Transparency**: Easy to track who deposited what
4. **Auditing**: Individual employer balances are auditable

## Need Help?

If you're still having issues:

1. **Check Your Connection**
   - MetaMask shows the connected account in top-right
   - Dashboard shows "Viewing balance for: [address]"
   - These should match

2. **Verify Transaction**
   - Get TX hash from MetaMask
   - Check on block explorer
   - Confirm it succeeded

3. **Check Total Balance**
   - "Total Treasury Balance" shows all funds
   - If this increased, your deposit succeeded
   - Just need to switch to the right account

4. **Contact Support**
   - Provide the depositing account address
   - Provide transaction hash
   - Screenshot of dashboard showing 0 balance

## Summary

**Remember:**
- ✅ Deposits are tied to wallet addresses
- ✅ Switch MetaMask to match the depositing account
- ✅ "Total Treasury Balance" shows all funds combined
- ✅ This is secure design, not a bug
- ✅ Use one consistent account for best experience

The funds are safe in the contract - you just need to view the dashboard with the correct account connected! 🎯
