# OffRamp Feature - Secure HLUSD to INR Conversion

## Overview

The OffRamp system enables employees to convert their HLUSD earnings to INR with live exchange rates from CoinGecko. The system uses cryptographic signature verification to ensure price integrity without relying on a centralized backend.

## Security Architecture

### How It Works

1. **Live Price Fetching**: Frontend fetches real-time rates from CoinGecko
   - HLUSD → USD rate
   - USD → INR rate
   - Composite rate: HLUSD → INR

2. **Cryptographic Signing**: Oracle wallet signs the price data
   - Price + timestamp are hashed
   - Oracle private key signs the hash
   - Creates unforgeable price attestation

3. **On-Chain Verification**: Smart contract verifies signature
   - Recovers signer from signature
   - Checks if signer matches oracle address
   - Validates timestamp (5-minute expiry)
   - Only valid signatures accepted

4. **Conversion Execution**: Contract processes conversion
   - Deducts 1% transaction fee
   - Calculates INR amount
   - Records conversion history

### Why This Is Secure

✅ **No Manual Rate Setting**: No function to arbitrarily set rates  
✅ **Signature Required**: Only oracle can sign valid rates  
✅ **Replay Protection**: Timestamp prevents reusing old signatures  
✅ **Expiration Window**: Rates expire after 5 minutes  
✅ **On-Chain Verification**: All validation happens in smart contract  
✅ **No Backend Required**: Fully decentralized operation  

## Setup Instructions

### 1. Generate Oracle Wallet

The oracle wallet is used solely for signing price data. Generate a new wallet:

```javascript
// Run in Node.js or browser console
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();

console.log('Oracle Address:', wallet.address);
console.log('Oracle Private Key:', wallet.privateKey);
```

**IMPORTANT**: Save both the address and private key securely!

### 2. Deploy Contracts

Set the oracle signer address when deploying:

```bash
cd contracts

# Option 1: Set in .env file
echo "ORACLE_SIGNER=0xYourOracleAddress" >> .env

# Option 2: Use deployer address (for testing only)
# The script uses deployer address by default if ORACLE_SIGNER not set

# Deploy all contracts including OffRamp
npx hardhat run scripts/deploy.js --network hela
```

The deployment will output the OffRamp contract address.

### 3. Update Frontend Configuration

Update `frontend/src/contracts.js` with the deployed OffRamp address:

```javascript
export const OFFRAMP_ADDRESS = "0xYourOffRampAddress";
```

### 4. Configure Oracle Private Key

Create `frontend/.env` (copy from `.env.example`):

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_ORACLE_PRIVATE_KEY=0xYourOraclePrivateKey
```

**SECURITY WARNING**: 
- Never commit `.env` to version control
- Keep the oracle private key secret
- In production, use a secure key management solution

## Usage

### Employee Flow

1. **Check Live Rate**: See current HLUSD → INR exchange rate
2. **Enter Amount**: Input HLUSD amount to convert
3. **Preview Conversion**: View estimated INR and fees
4. **Confirm**: Click "Convert to INR"
5. **Transaction**: System fetches rate, signs it, and submits to blockchain
6. **View History**: See all past conversions

### Transaction Fees

- **Network Fee**: Gas fee paid in HLUSD (like ETH)
- **Protocol Fee**: 1% of conversion amount
- **Example**: Converting 100 HLUSD
  - Fee: 1 HLUSD
  - Net converted: 99 HLUSD
  - You receive: 99 × current_rate INR

## Technical Details

### Smart Contract Functions

```solidity
// Convert HLUSD to INR
function convertToFiat(
    uint256 rate,        // Exchange rate scaled by 1e18
    uint256 timestamp,   // Unix timestamp when signed
    bytes calldata signature  // ECDSA signature
) external payable

// View conversion history
function getUserConversions(address user) 
    external view returns (uint256[])

function getConversion(uint256 conversionId) 
    external view returns (Conversion memory)

// View platform statistics
function getStats() 
    external view returns (uint256 volume, uint256 fees, uint256 count)
```

### Frontend Services

```javascript
// Fetch live rates
import { fetchLiveRates } from './services/offRampService';
const rates = await fetchLiveRates();

// Sign rate data
import { getSignedRate } from './services/offRampService';
const { rate, timestamp, signature } = await getSignedRate(oraclePrivateKey);

// Call contract
await offRampContract.convertToFiat(rate, timestamp, signature, {
    value: ethers.parseEther(amount)
});
```

## Production Considerations

### Current Setup (Hackathon)
- Oracle private key in frontend `.env`
- Suitable for demo/testing
- Single oracle signer

### Production Recommendations

1. **Backend Oracle Service**
   - Separate server holds oracle private key
   - API endpoint signs rates
   - Rate limiting and monitoring

2. **Multiple Oracle Signers**
   - Multi-sig approach
   - Require N of M signatures
   - Increased decentralization

3. **Chainlink Integration**
   - Use Chainlink Price Feeds
   - Industry-standard oracles
   - High reliability

4. **Rate Limits**
   - Per-user conversion limits
   - Cooldown periods
   - Anti-abuse measures

5. **Enhanced Validation**
   - Price deviation checks
   - Volume-based limits
   - Emergency pause function

## Testing

### Test Conversion Flow

```javascript
// 1. Check oracle signer matches
const oracleSigner = await offRamp.oracleSigner();
console.log('Oracle:', oracleSigner);

// 2. Get current stats
const [volume, fees, count] = await offRamp.getStats();
console.log('Total conversions:', count);

// 3. Fetch and sign rate
const signedData = await getSignedRate(ORACLE_PRIVATE_KEY);

// 4. Convert
const tx = await offRamp.convertToFiat(
    signedData.rate,
    signedData.timestamp,
    signedData.signature,
    { value: ethers.parseEther("1.0") }
);
await tx.wait();

// 5. Check history
const conversions = await offRamp.getUserConversions(address);
```

### Common Issues

**"Invalid rate signature"**
- Check oracle private key matches deployed signer address
- Ensure rate hasn't expired (5 min window)
- Verify signing process matches contract's hash function

**"Rate expired"**
- Timestamp too old
- Network delays
- Increase RATE_VALIDITY_WINDOW in contract if needed

**OffRamp not loaded**
- Verify OFFRAMP_ADDRESS is set in contracts.js
- Check address is not zero address
- Ensure contract deployed successfully

## API Reference

### CoinGecko Endpoint

```
HLUSD → INR (Direct):
https://api.coingecko.com/api/v3/simple/price?ids=hela-usd&vs_currencies=inr
```

### Rate Calculation

```javascript
// Fetch direct HLUSD → INR rate
const response = await fetch(
  'https://api.coingecko.com/api/v3/simple/price?ids=hela-usd&vs_currencies=inr'
);
const data = await response.json();
const hlusdToInr = data['hela-usd']?.inr || 83;  // Example: 1 HLUSD = ₹83

// Scale for contract (18 decimals)
const scaledRate = BigInt(Math.floor(hlusdToInr * 1e18));
```

## Monitoring

### Track Platform Activity

```javascript
// Listen to conversion events
offRamp.on('ConversionExecuted', (conversionId, user, hlusdAmount, inrAmount, feeAmount, rateUsed, timestamp) => {
    console.log(`Conversion ${conversionId}:`);
    console.log(`  User: ${user}`);
    console.log(`  HLUSD: ${ethers.formatEther(hlusdAmount)}`);
    console.log(`  INR: ${Number(inrAmount) / 1e18}`);
    console.log(`  Fee: ${ethers.formatEther(feeAmount)}`);
    console.log(`  Rate: ${Number(rateUsed) / 1e18}`);
});

// Get platform stats
const stats = await offRamp.getStats();
console.log('Platform Volume:', ethers.formatEther(stats.volume), 'HLUSD');
console.log('Fees Collected:', ethers.formatEther(stats.fees), 'HLUSD');
console.log('Total Conversions:', Number(stats.count));
```

## Compliance & Legal

**Disclaimer**: This is a demo implementation for educational purposes. Real-world deployment requires:

- Regulatory compliance (KYC/AML)
- Fiat payment integration
- Legal entity and licenses
- Banking relationships
- Tax reporting
- User agreements

The current system demonstrates the cryptographic verification mechanism only.

## Support

For issues or questions:
1. Check contract deployment addresses
2. Verify oracle configuration
3. Review browser console for errors
4. Check MetaMask for transaction status
5. View block explorer for on-chain data

## License

MIT License - See LICENSE file for details
