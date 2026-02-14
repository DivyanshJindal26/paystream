# Account Switching Fix - Testing Guide

## What Was Fixed

**Problem**: When switching MetaMask accounts, deposits from the new account were being credited to the old account.

**Root Cause**: The `signer` and `contracts` weren't being rebuilt when accounts changed, so they continued using the first account's credentials even though the UI showed a different account.

**Solution**: Updated `handleAccountsChanged` in WalletContext to rebuild the signer and contracts whenever the account changes.

## How to Test the Fix

### Step 1: Clear Cache and Restart
```bash
# Stop the dev server (Ctrl+C)
# Clear browser cache or open incognito window
# Start fresh
npm run dev
```

### Step 2: Connect with Account A
1. Connect MetaMask with Account A
2. Check browser console - you should see:
   ```
   💰 Fetching balances for account: 0xAccountA...
   ✅ Balances fetched: { account: '0xAccountA...', total: '...', ... }
   ```

### Step 3: Deposit from Account A
1. Deposit 100 HLUSD from Account A
2. Check console output:
   ```
   💸 Initiating deposit...
     Account: 0xAccountA...
     Amount: 100 HLUSD
   📝 Transaction sent: 0x...
     From: 0xAccountA...
   ✅ Deposit confirmed!
   💰 Fetching balances for account: 0xAccountA...
   ✅ Balances fetched: { total: '100', ... }
   ```
3. **Verify**: "Your Total Deposited" shows 100 HLUSD

### Step 4: Switch to Account B
1. Open MetaMask
2. Switch to Account B
3. Check console - you should see:
   ```
   🔄 Account changed to: 0xAccountB...
   ✅ Contracts rebuilt for new account
   💰 Fetching balances for account: 0xAccountB...
   ✅ Balances fetched: { account: '0xAccountB...', total: '0', ... }
   ```
4. **Verify**: Dashboard now shows Account B's address in the banner
5. **Verify**: "Your Total Deposited" shows 0 HLUSD (Account B hasn't deposited yet)
6. **Verify**: "Total Treasury Balance" shows 100 HLUSD (from Account A)

### Step 5: Deposit from Account B
1. Deposit 50 HLUSD from Account B
2. Check console output:
   ```
   💸 Initiating deposit...
     Account: 0xAccountB...
     Amount: 50 HLUSD
   📝 Transaction sent: 0x...
     From: 0xAccountB...   ← Should be Account B!
   ✅ Deposit confirmed!
   💰 Fetching balances for account: 0xAccountB...
   ✅ Balances fetched: { total: '50', ... }  ← Account B's balance!
   ```
3. **Verify**: "Your Total Deposited" shows 50 HLUSD (for Account B)
4. **Verify**: "Total Treasury Balance" shows 150 HLUSD (100 from A + 50 from B)

### Step 6: Switch Back to Account A
1. Switch MetaMask back to Account A
2. Check console:
   ```
   🔄 Account changed to: 0xAccountA...
   ✅ Contracts rebuilt for new account
   💰 Fetching balances for account: 0xAccountA...
   ✅ Balances fetched: { account: '0xAccountA...', total: '100', ... }
   ```
3. **Verify**: "Your Total Deposited" shows 100 HLUSD (Account A's balance unchanged)
4. **Verify**: "Total Treasury Balance" shows 150 HLUSD (same total)

## Console Logs to Watch For

### ✅ CORRECT Behavior (After Fix)
```
// When switching accounts
🔄 Account changed to: 0xNewAccount...
✅ Contracts rebuilt for new account
💰 Fetching balances for account: 0xNewAccount...

// When depositing
💸 Initiating deposit...
  Account: 0xNewAccount...     ← Matches UI
📝 Transaction sent: 0x...
  From: 0xNewAccount...        ← Matches account!
```

### ❌ INCORRECT Behavior (Before Fix)
```
// When switching accounts
Account changed but no contract rebuild

// When depositing
💸 Initiating deposit...
  Account: 0xAccountB...       ← UI shows B
📝 Transaction sent: 0x...
  From: 0xAccountA...          ← But transaction from A! BUG!
```

## Expected Results

### Account A
- Deposited: 100 HLUSD
- Balance shown when connected to A: 100 HLUSD

### Account B  
- Deposited: 50 HLUSD
- Balance shown when connected to B: 50 HLUSD

### Total Treasury
- Should always show: 150 HLUSD
- This is visible from any connected account

## Verification Checklist

- [ ] Account address in UI matches MetaMask
- [ ] Console shows "Contracts rebuilt" when switching
- [ ] Deposit transaction `From` field matches current account
- [ ] Balance updates for correct account after deposit
- [ ] "Total Treasury Balance" shows sum of all deposits
- [ ] Switching between accounts shows different balances
- [ ] Each account can only spend their own deposited funds

## Block Explorer Verification

For each deposit transaction:

1. Copy the transaction hash from console or toast notification
2. Go to: `https://testnet-blockexplorer.helachain.com/tx/[TX_HASH]`
3. Check the "From" address matches the account that deposited
4. Check the "Value" matches the deposit amount
5. Verify transaction status is "Success"

## If It Still Doesn't Work

1. **Hard Refresh**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Clear Browser Cache**: 
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cached images and files"
   - Clear
3. **Restart Dev Server**:
   ```bash
   # Kill any running processes
   # Restart
   npm run dev
   ```
4. **Try Incognito/Private Window**: This ensures no cached code
5. **Check MetaMask**: Make sure the account shown in MetaMask matches the dashboard

## Debug Commands

Open browser console (F12) and try these:

```javascript
// Check current account
console.log('Current account:', account);

// Check signer address
const signerAddr = await signer.getAddress();
console.log('Signer address:', signerAddr);

// They should match!
if (account === signerAddr) {
  console.log('✅ Account and signer match');
} else {
  console.log('❌ MISMATCH! This is the bug!');
  console.log('  UI shows:', account);
  console.log('  But signer is:', signerAddr);
}

// Check balances directly
const treasuryBalance = await contracts.treasury.employerBalances(account);
console.log('Balance for', account, ':', ethers.formatEther(treasuryBalance), 'HLUSD');
```

## Key Changes Made

### 1. WalletContext.jsx - handleAccountsChanged
```javascript
// BEFORE (broken)
const handleAccountsChanged = useCallback((accounts) => {
  if (accounts.length === 0) {
    // ... disconnect
  } else {
    setAccount(accounts[0]);  // Only updated account, not signer!
  }
}, []);

// AFTER (fixed)
const handleAccountsChanged = useCallback(async (accounts) => {
  if (accounts.length === 0) {
    // ... disconnect
  } else {
    const p = new ethers.BrowserProvider(window.ethereum);
    const s = await p.getSigner();  // Get NEW signer
    const network = await p.getNetwork();
    const id = Number(network.chainId);
    
    setSigner(s);  // Update signer!
    setAccount(accounts[0]);
    
    if (id === HELA_CHAIN_ID) {
      setContracts(buildContracts(s));  // Rebuild contracts with new signer!
    }
  }
}, [buildContracts]);
```

### 2. Added Debug Logging
- Console logs when account changes
- Console logs when contracts rebuild
- Console logs when fetching balances
- Console logs in deposit function

## Success Criteria

✅ The fix is working correctly if:
1. Switching accounts triggers "Contracts rebuilt" message
2. Deposits go to the account shown in the UI
3. Each account shows its own balance when connected
4. Total Treasury Balance = sum of all deposits from all accounts

🎉 You should now be able to use multiple accounts independently!
