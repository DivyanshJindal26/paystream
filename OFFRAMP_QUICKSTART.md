# OffRamp Quick Start Guide

This guide will help you deploy and test the secure OffRamp feature.

## Prerequisites

- HeLa testnet configured in MetaMask
- HLUSD in your wallet for gas fees
- Node.js and npm installed
- Existing PayStream deployment (Treasury + SalaryStream)

## Step 1: Generate Oracle Wallet

Run this in Node.js or browser console:

```javascript
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Oracle Address:', wallet.address);
console.log('Oracle Private Key:', wallet.privateKey);
```

**Save both values!** You'll need them for deployment and frontend configuration.

## Step 2: Configure Deployment

In `contracts/.env`, add:

```env
ORACLE_SIGNER=0xYourOracleAddressFromStep1
```

Or skip this step to use deployer address as oracle signer (for testing).

## Step 3: Deploy Contracts

```bash
cd contracts
npm install @openzeppelin/contracts  # If not already installed
npx hardhat run scripts/deploy.js --network hela
```

The deployment will output:
- Treasury address
- SalaryStream address
- **OffRamp address** ← Copy this!
- Oracle Signer address

## Step 4: Update Frontend Configuration

Edit `frontend/src/contracts.js`:

```javascript
export const OFFRAMP_ADDRESS = "0xYourOffRampAddressFromStep3";
```

## Step 5: Configure Oracle Private Key

Create `frontend/.env`:

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_ORACLE_PRIVATE_KEY=0xYourOraclePrivateKeyFromStep1
```

**IMPORTANT**: Never commit this file! It's already in `.gitignore`.

## Step 6: Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

## Step 7: Test the OffRamp

1. **Connect Wallet** in the app
2. **Navigate to Employee Dashboard**
3. **Scroll to OffRamp section**
4. **Check live rate** - Should show HLUSD → INR exchange rate
5. **Enter amount** to convert
6. **Review estimation** - Shows fee (1%) and INR amount
7. **Click "Convert to INR"**
8. **Confirm transaction** in MetaMask
9. **View history** - Your conversion appears in the table

## Verification Checklist

✅ Contract deployed successfully  
✅ OffRamp address updated in frontend  
✅ Oracle private key set in .env  
✅ Live rate displays correctly  
✅ Conversion completes without errors  
✅ History shows conversion record  
✅ Platform stats update  

## Testing Different Scenarios

### Test 1: Basic Conversion
```
Amount: 1 HLUSD
Expected: ~83 INR (after 1% fee)
```

### Test 2: Verify Signature Security
Try calling contract directly with wrong signature → Should fail with "Invalid rate signature"

### Test 3: Check Rate Expiry
Wait 6+ minutes, try using old signature → Should fail with "Rate expired"

### Test 4: View History
Check getUserConversions() and getConversion() work correctly

## Common Issues & Solutions

### Issue: "Invalid rate signature"

**Solution**:
1. Verify oracle private key in `.env` matches oracle signer in contract
2. Check command: `await offRamp.oracleSigner()` should match wallet address
3. Ensure `.env` file has the correct `VITE_` prefix

### Issue: OffRamp not showing in dashboard

**Solution**:
1. Check OFFRAMP_ADDRESS in contracts.js is not zero address
2. Verify contract deployed successfully
3. Clear browser cache and reload
4. Check browser console for errors

### Issue: "Rate expired"

**Solution**:
- This is normal if rate is older than 5 minutes
- Just try again - system will fetch fresh rate
- For testing, you can modify RATE_VALIDITY_WINDOW in contract

### Issue: Transaction fails with no error

**Solution**:
1. Check you have enough HLUSD in wallet
2. Verify gas limit is sufficient
3. Check MetaMask for detailed error
4. Look at transaction on block explorer

## Manual Contract Interaction

### Check Oracle Signer
```javascript
const oracleSigner = await offRamp.oracleSigner();
console.log('Oracle:', oracleSigner);
```

### View Platform Stats
```javascript
const [volume, fees, count] = await offRamp.getStats();
console.log('Volume:', ethers.formatEther(volume), 'HLUSD');
console.log('Fees:', ethers.formatEther(fees), 'HLUSD');
console.log('Conversions:', count.toString());
```

### Check User Conversion History
```javascript
const conversionIds = await offRamp.getUserConversions(userAddress);
for (const id of conversionIds) {
    const conv = await offRamp.getConversion(id);
    console.log('Conversion', id.toString(), conv);
}
```

### Manual Conversion (Advanced)
```javascript
import { getSignedRate } from './services/offRampService';

// Get signed rate
const signedData = await getSignedRate(oraclePrivateKey);

// Convert
const tx = await offRamp.convertToFiat(
    signedData.rate,
    signedData.timestamp,
    signedData.signature,
    { value: ethers.parseEther("1.0") }
);
await tx.wait();
console.log('Conversion successful!');
```

## Security Notes

### What Can Go Wrong?

❌ **Compromised Oracle Key**: Anyone with the private key can sign arbitrary rates
- Keep key secure
- Use environment variables
- Never commit to Git

❌ **Frontend Security**: Private key in frontend is not production-ready
- Acceptable for hackathon/demo
- Production: Use backend oracle service

✅ **What's Secure?**
- Users cannot manipulate exchange rates
- Old signatures cannot be replayed
- Stale rates expire automatically
- All validation happens on-chain

## Production Deployment

For real-world use, upgrade to:

1. **Backend Oracle Service**
   - Express/NestJS API
   - Rate signing endpoint
   - Rate limiting
   - Monitoring & alerts

2. **Enhanced Contract**
   - Access control (Ownable)
   - Emergency pause
   - Rate deviation limits
   - Multi-sig oracle

3. **Compliance**
   - KYC/AML integration
   - Fiat payment processor
   - Regulatory compliance
   - Legal framework

## Next Steps

- ✅ Deploy and test OffRamp
- ✅ Verify security features work
- ✅ Test with multiple users
- ✅ Monitor conversion events
- ✅ Prepare demo for judges

## Support Resources

- Main README: See `OFFRAMP_README.md` for detailed documentation
- Contract source: `contracts/contracts/OffRamp.sol`
- Frontend component: `frontend/src/components/OffRampPanel.jsx`
- Service layer: `frontend/src/services/offRampService.js`

## Demo Tips for Judges

1. **Show live rate fetching** - Point out CoinGecko integration
2. **Highlight security** - Explain signature verification
3. **Display conversion history** - Show transparency
4. **Explain math** - Direct HLUSD → INR conversion
5. **Demo protection** - Show expired signatures fail
6. **Platform stats** - Display volume, fees, count

## Success Metrics

Your implementation is working correctly if:

✅ Live rates update every 30 seconds  
✅ Conversions execute successfully  
✅ Correct INR amount calculated  
✅ 1% fee deducted properly  
✅ History records all conversions  
✅ Invalid signatures rejected  
✅ Expired rates rejected  
✅ Platform stats accurate  

Congratulations! Your secure on-chain OffRamp is ready! 🎉
