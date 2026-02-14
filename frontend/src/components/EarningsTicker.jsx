import { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import normalizeBigInts from '../utils/normalizeBigInts';

export default function EarningsTicker({ employeeAddress }) {
  const { contracts } = useWallet();
  const [grossValue, setGrossValue] = useState('0.000000');
  const [netValue, setNetValue] = useState('0.000000');
  const [taxPercent, setTaxPercent] = useState('0'); // Store as string
  const [ratePerSecond, setRatePerSecond] = useState('0'); // Store as string
  const [startTime, setStartTime] = useState('0'); // Stream start timestamp
  const [withdrawn, setWithdrawn] = useState('0'); // Already withdrawn amount
  const lastFetchedValue = useRef('0'); // Store as string
  const lastFetchTime = useRef(Date.now());

  const fetchWithdrawable = useCallback(async () => {
    if (!contracts.salaryStream || !employeeAddress) return;
    try {
      const val = await contracts.salaryStream.getWithdrawable(employeeAddress);
      
      // Get stream details for tax and rate
      const stream = await contracts.salaryStream.streams(employeeAddress);
      const normalized = normalizeBigInts(stream);
      
      const newValue = val.toString();
      const previousValue = lastFetchedValue.current;
      
      // Check if the contract value has been updated (new block mined)
      const hasUpdated = newValue !== previousValue && previousValue !== '0';
      
      // Debug logging
      console.log('=== EarningsTicker Debug ===');
      console.log('Withdrawable (from contract):', newValue);
      console.log('Previous value:', previousValue);
      console.log('Has updated:', hasUpdated ? 'YES - Using fresh contract value' : 'NO - Will interpolate');
      console.log('Rate per second:', normalized[2]);
      console.log('Tax percent:', normalized[7]);
      console.log('===========================');
      
      // If value updated (new block), use it as new baseline
      if (hasUpdated || previousValue === '0') {
        lastFetchedValue.current = newValue;
        lastFetchTime.current = Date.now();
        console.log('✅ Baseline updated to contract value');
      }
      
      setRatePerSecond(normalized[2]);
      setTaxPercent(normalized[7]);
      setStartTime(normalized[3]);
      setWithdrawn(normalized[5]);
    } catch (e) {
      console.error('EarningsTicker fetch error:', e);
    }
  }, [contracts.salaryStream, employeeAddress]);

  // Fetch on-chain value every 5 seconds (requirement: real-time updates)
  useEffect(() => {
    fetchWithdrawable();
    const interval = setInterval(fetchWithdrawable, 5000);
    return () => clearInterval(interval);
  }, [fetchWithdrawable]);

  // Smooth local interpolation every 100ms
  useEffect(() => {
    const tick = setInterval(() => {
      // Convert string values back to BigInt for calculations
      const ratePerSecBigInt = BigInt(ratePerSecond || '0');
      if (ratePerSecBigInt === 0n) return;
      
      // Use the last fetched value from contract as baseline
      const baselineBigInt = BigInt(lastFetchedValue.current || '0');
      
      // Calculate elapsed time since last contract update
      const elapsedMs = Date.now() - lastFetchTime.current;
      const elapsedSeconds = BigInt(Math.floor(elapsedMs / 1000));
      
      // Interpolate: baseline + (rate * elapsed time)
      const grossWithdrawable = baselineBigInt + (ratePerSecBigInt * elapsedSeconds);
      
      // Calculate net after tax (this is what user actually receives)
      const taxPercentBigInt = BigInt(taxPercent || '0');
      const taxAmount = (grossWithdrawable * taxPercentBigInt) / 100n;
      const netWithdrawable = grossWithdrawable - taxAmount;
      
      const grossFormatted = ethers.formatEther(grossWithdrawable);
      const netFormatted = ethers.formatEther(netWithdrawable);
      
      // Show 6 decimal places
      const formatValue = (str) => {
        const [whole, dec = ''] = str.split('.');
        return `${whole}.${dec}`;
      };
      
      setGrossValue(formatValue(grossFormatted));
      setNetValue(formatValue(netFormatted));
    }, 100);
    return () => clearInterval(tick);
  }, [ratePerSecond, taxPercent]);

  return (
    <div className="earnings-ticker">
      <div className="earnings-label">You Will Receive (After {taxPercent}% Tax)</div>
      <div className="earnings-value">
        {netValue}
        <span className="earnings-unit">HLUSD</span>
      </div>
      <div className="form-hint" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
        Gross: {grossValue} HLUSD · Tax: {taxPercent}%
      </div>
    </div>
  );
}
