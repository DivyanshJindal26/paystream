import { ethers } from 'ethers';

/**
 * Fetch live exchange rates from CoinGecko API
 * @returns {Promise<{hlusdToInr: number, compositeRate: number}>}
 */
export async function fetchLiveRates() {
  try {
    // Fetch HLUSD → INR rate directly
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=hela-usd&vs_currencies=inr'
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch HLUSD to INR price');
    }
    
    const data = await response.json();
    const hlusdToInr = data['hela-usd']?.inr || 83; // Fallback to ~83 INR per HLUSD

    return {
      hlusdToInr,
      compositeRate: hlusdToInr
    };
  } catch (error) {
    console.error('Error fetching rates:', error);
    
    // Fallback rate for development
    return {
      hlusdToInr: 83,
      compositeRate: 83
    };
  }
}

/**
 * Sign exchange rate using oracle private key
 * @param {number} rate - Composite exchange rate (HLUSD → INR)
 * @param {number} timestamp - Unix timestamp in seconds
 * @param {string} oraclePrivateKey - Oracle wallet private key
 * @returns {Promise<{rate: bigint, timestamp: bigint, signature: string}>}
 */
export async function signRate(rate, timestamp, oraclePrivateKey) {
  try {
    // Create oracle wallet from private key
    const oracleWallet = new ethers.Wallet(oraclePrivateKey);

    // Scale rate to 18 decimals for smart contract
    const scaledRate = BigInt(Math.floor(rate * 1e18));
    const timestampBigInt = BigInt(timestamp);

    // Create message hash matching contract's _hashRate function
    const messageHash = ethers.solidityPackedKeccak256(
      ['uint256', 'uint256'],
      [scaledRate, timestampBigInt]
    );

    // Sign the message
    const signature = await oracleWallet.signMessage(
      ethers.getBytes(messageHash)
    );

    return {
      rate: scaledRate,
      timestamp: timestampBigInt,
      signature
    };
  } catch (error) {
    console.error('Error signing rate:', error);
    throw new Error('Failed to sign rate: ' + error.message);
  }
}

/**
 * Get signed rate data ready for contract call
 * @param {string} oraclePrivateKey - Oracle wallet private key
 * @returns {Promise<{rate: bigint, timestamp: bigint, signature: string, compositeRate: number, hlusdToInr: number}>}
 */
export async function getSignedRate(oraclePrivateKey) {
  // Fetch live rates
  const { compositeRate, hlusdToInr } = await fetchLiveRates();

  // Get current timestamp
  const timestamp = Math.floor(Date.now() / 1000);

  // Sign the rate
  const signedData = await signRate(compositeRate, timestamp, oraclePrivateKey);

  return {
    ...signedData,
    compositeRate,
    hlusdToInr
  };
}

/**
 * Calculate conversion output
 * @param {string} hlusdAmount - Amount in HLUSD (in ether units)
 * @param {number} rate - Exchange rate (HLUSD → INR)
 * @param {number} feePercent - Fee percentage (default 1%)
 * @returns {{inrAmount: number, feeAmount: string, netAmount: string}}
 */
export function calculateConversion(hlusdAmount, rate, feePercent = 1) {
  const amountWei = ethers.parseEther(hlusdAmount.toString());
  const feeAmount = (amountWei * BigInt(feePercent)) / 100n;
  const netAmount = amountWei - feeAmount;
  
  // Calculate INR output
  const inrAmount = (Number(ethers.formatEther(netAmount)) * rate).toFixed(2);
  
  return {
    inrAmount: parseFloat(inrAmount),
    feeAmount: ethers.formatEther(feeAmount),
    netAmount: ethers.formatEther(netAmount)
  };
}

/**
 * Verify if a rate is still valid (not expired)
 * @param {number} rateTimestamp - Timestamp when rate was signed (Unix seconds)
 * @param {number} validityWindow - Validity window in seconds (default 300 = 5 minutes)
 * @returns {boolean}
 */
export function isRateValid(rateTimestamp, validityWindow = 300) {
  const now = Math.floor(Date.now() / 1000);
  return now <= rateTimestamp + validityWindow;
}

/**
 * Format conversion history for display
 * @param {Array} conversions - Array of conversion objects from contract
 * @returns {Array} Formatted conversions
 */
export function formatConversionHistory(conversions) {
  return conversions.map((conv, index) => ({
    id: index,
    hlusdAmount: ethers.formatEther(conv.hlusdAmount),
    inrAmount: (Number(ethers.formatEther(conv.inrAmount)) / 1e18).toFixed(2),
    feeAmount: ethers.formatEther(conv.feeAmount),
    rate: (Number(conv.rateUsed) / 1e18).toFixed(2),
    timestamp: new Date(Number(conv.timestamp) * 1000).toLocaleString(),
    user: conv.user
  }));
}
