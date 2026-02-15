# Oracle Setup Guide

The PayStream oracle is used to provide cryptographically signed exchange rates for the OffRamp feature (HLUSD → INR conversion).

## What is the Oracle?

The oracle is a simple Ethereum wallet that:
1. Signs exchange rate data with its private key
2. The signature is verified on-chain by the OffRamp contract
3. This prevents unauthorized parties from manipulating exchange rates

## Generate Oracle Wallet

Run this command in the `contracts` directory:

```bash
node generate-oracle.js
```

**Output:**
```
🔐 Oracle Wallet Generator
✅ New oracle wallet generated!

📋 Save these values securely:
┌─────────────────────────────────────────────────────────┐
│ Oracle Address (Public):                                │
│ 0x1234...5678                                           │
├─────────────────────────────────────────────────────────┤
│ Oracle Private Key:                                     │
│ 0xabcd...ef01                                           │
└─────────────────────────────────────────────────────────┘
```

## Configuration Steps

### 1. For Contract Deployment

Edit `contracts/.env`:

```env
# Your deployer wallet private key (needs HLUSD for gas)
PRIVATE_KEY=0x...

# Oracle signer address (from generate-oracle.js output)
ORACLE_SIGNER=0x1234...5678

# HeLa RPC
HELA_RPC_URL=https://testnet-rpc.helachain.com
```

Then deploy:
```bash
npx hardhat run scripts/deploy.js --network hela
```

The OffRamp contract will be deployed with this oracle address as the trusted signer.

### 2. For Backend/Frontend

Edit root `/.env`:

```env
# Oracle private key (from generate-oracle.js output)
ORACLE_PRIVATE_KEY=0xabcd...ef01

# Other config...
MONGODB_URI=mongodb+srv://...
VITE_TREASURY_CONTRACT=0x...
VITE_STREAM_CONTRACT=0x...
VITE_OFFRAMP_CONTRACT=0x...
```

## How the Oracle Works

### Rate Signing Flow

1. **Frontend** requests a signed rate from the backend
2. **Backend** (`/api/oracle/signed-rate` endpoint):
   - Fetches live HLUSD/USD and USD/INR rates from CoinGecko
   - Calculates composite HLUSD/INR rate
   - Creates message hash: `keccak256(rate, timestamp)`
   - Signs hash with oracle private key
   - Returns `{rate, timestamp, signature}`
3. **Frontend** calls `OffRamp.convertToFiat(rate, timestamp, signature)`
4. **Smart Contract** verifies:
   - Signature matches oracle address
   - Timestamp is within validity window (5 minutes)
   - Rate data integrity

### Backend Implementation

See `backend/routes/oracle.js`:

```javascript
router.get('/signed-rate', async (req, res) => {
  try {
    // Fetch rates from CoinGecko
    const rates = await fetchLiveRates();
    
    // Sign with oracle wallet
    const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY);
    const rate = BigInt(Math.floor(rates.compositeRate * 1e18));
    const timestamp = BigInt(Math.floor(Date.now() / 1000));
    
    const messageHash = ethers.solidityPackedKeccak256(
      ['uint256', 'uint256'],
      [rate, timestamp]
    );
    
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));
    
    res.json({
      success: true,
      rate: rate.toString(),
      timestamp: timestamp.toString(),
      signature,
      compositeRate: rates.compositeRate,
      hlusdToInr: rates.hlusdToInr
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Smart Contract Verification

See `contracts/contracts/OffRamp.sol`:

```solidity
function _verify(
    uint256 rate,
    uint256 timestamp,
    bytes calldata signature
) internal view returns (bool) {
    require(block.timestamp <= timestamp + RATE_VALIDITY_WINDOW, "Rate expired");
    
    bytes32 messageHash = keccak256(abi.encodePacked(rate, timestamp));
    bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(messageHash);
    
    return ethSignedMessageHash.recover(signature) == oracleSigner;
}
```

## Security Best Practices

### ✅ DO

- Keep oracle private key SECRET
- Never commit `.env` files to Git
- Use environment variables for oracle key
- Run oracle signing server-side (backend)
- Validate oracle address matches during contract deployment
- Monitor oracle signing activity
- Use HTTPS for oracle API endpoints

### ❌ DON'T

- Expose oracle private key in frontend code
- Hardcode oracle private key anywhere
- Share oracle private key publicly
- Use same key for multiple deployments (testnet/mainnet)
- Skip signature verification in contracts

## Verification

### Check Oracle Signer in Contract

```bash
npx hardhat console --network hela
```

```javascript
const OffRamp = await ethers.getContractAt("OffRamp", "YOUR_OFFRAMP_ADDRESS");
const oracle = await OffRamp.oracleSigner();
console.log("Configured Oracle:", oracle);
```

This should match your oracle wallet address.

### Test Oracle Signing

Create a test script `test-oracle.js`:

```javascript
const { ethers } = require('ethers');

async function testOracleSigning() {
  const oracleKey = process.env.ORACLE_PRIVATE_KEY;
  const wallet = new ethers.Wallet(oracleKey);
  
  console.log("Oracle Address:", wallet.address);
  
  const rate = BigInt(Math.floor(83.5 * 1e18)); // 83.5 INR per HLUSD
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  
  const messageHash = ethers.solidityPackedKeccak256(
    ['uint256', 'uint256'],
    [rate, timestamp]
  );
  
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));
  
  console.log("Rate:", ethers.formatUnits(rate, 18));
  console.log("Timestamp:", timestamp.toString());
  console.log("Signature:", signature);
  
  // Verify signature
  const recovered = ethers.verifyMessage(ethers.getBytes(messageHash), signature);
  console.log("Recovered Address:", recovered);
  console.log("Match:", recovered.toLowerCase() === wallet.address.toLowerCase());
}

testOracleSigning();
```

Run:
```bash
node test-oracle.js
```

## Troubleshooting

### "Invalid oracle signature" error

**Cause**: Oracle private key doesn't match the oracle signer address set in the OffRamp contract.

**Fix**:
1. Verify oracle address in contract matches your oracle wallet
2. Check `ORACLE_PRIVATE_KEY` in `.env` is correct
3. Re-generate oracle wallet and re-deploy contracts if needed

### "Rate expired" error

**Cause**: Timestamp is older than 5 minutes (RATE_VALIDITY_WINDOW).

**Fix**:
1. Ensure system clocks are synchronized
2. Request fresh signed rate from backend
3. Don't cache signed rates for too long

### Backend oracle endpoint returns 500

**Cause**: Missing/invalid `ORACLE_PRIVATE_KEY` or CoinGecko API issue.

**Fix**:
1. Check backend logs: `docker compose logs backend`
2. Verify `ORACLE_PRIVATE_KEY` is set in backend environment
3. Test CoinGecko API: `curl https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd,inr`

## Production Considerations

### Option 1: Backend Oracle (Current)

- Oracle private key stored in backend environment
- Backend signs rates on request
- Pros: Simple, no external dependencies
- Cons: Single point of failure

### Option 2: Decentralized Oracle Network (Future)

- Use Chainlink, Pyth, or custom oracle network
- Multiple oracle nodes sign rates
- Aggregate signatures on-chain
- Pros: More secure, decentralized
- Cons: More complex, may require fees

### Option 3: On-chain Oracle (HeLa Native)

- If HeLa provides native price feeds
- Use HeLa's oracle infrastructure
- Pros: Native, trusted
- Cons: Depends on HeLa oracle availability

## Summary

The PayStream oracle is a critical component that enables secure OffRamp conversions. By cryptographically signing exchange rates, it prevents unauthorized rate manipulation while maintaining decentralization principles.

**Key Points:**
- Oracle wallet is separate from deployer wallet
- Private key must be kept secret
- Signatures are verified on-chain
- Rate validity is time-bound (5 minutes)
- Backend endpoint provides signed rates to frontend

For complete deployment guide including oracle setup, see [FULL_SETUP_GUIDE.md](../FULL_SETUP_GUIDE.md).
