import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import StreamCard from '../components/StreamCard';
import normalizeBigInts from '../utils/normalizeBigInts';

export default function EmployeeDashboard() {
  const { account, contracts, isCorrectNetwork } = useWallet();
  const [stream, setStream] = useState(null);
  const [hasStream, setHasStream] = useState(false);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [successPulse, setSuccessPulse] = useState(false);

  const addToast = useCallback((message, type = 'info', txHash = null) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, txHash }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const fetchStream = useCallback(async () => {
    if (!contracts.salaryStream || !account) return;
    setLoading(true);
    try {
      const exists = await contracts.salaryStream.hasStream(account);
      setHasStream(exists);
      if (exists) {
        const details = await contracts.salaryStream.getStreamDetails(account);
        // Normalize BigInt before setting state
        const normalized = normalizeBigInts(details);
        setStream(normalized);
      }
    } catch (err) {
      console.error('Fetch stream error:', err);
    } finally {
      setLoading(false);
    }
  }, [contracts.salaryStream, account]);

  useEffect(() => {
    fetchStream();
  }, [fetchStream]);

  const handleWithdraw = async () => {
    if (!contracts.salaryStream || !stream) return;
    setWithdrawing(true);
    try {
      // Get withdrawable amount before transaction
      const grossWithdrawable = await contracts.salaryStream.getWithdrawable(account);
      const taxPercent = BigInt(stream[7]); // Convert normalized string back to BigInt
      const taxAmount = (grossWithdrawable * taxPercent) / 100n;
      const netAmount = grossWithdrawable - taxAmount;
      
      console.log('=== WITHDRAWAL DEBUG ===');
      console.log('Gross withdrawable:', ethers.formatEther(grossWithdrawable), 'HLUSD');
      console.log('Tax percent:', stream[7], '%');
      console.log('Tax amount:', ethers.formatEther(taxAmount), 'HLUSD');
      console.log('Net amount to receive:', ethers.formatEther(netAmount), 'HLUSD');
      console.log('Employee address:', account);
      
      // Check balance before
      const provider = contracts.salaryStream.runner.provider;
      const balanceBefore = await provider.getBalance(account);
      console.log('Balance BEFORE withdrawal:', ethers.formatEther(balanceBefore), 'HLUSD');
      
      const tx = await contracts.salaryStream.withdraw();
      addToast(
        `Claiming ${ethers.formatEther(netAmount)} HLUSD (after ${stream[7]}% tax)... TX: ${tx.hash}`,
        'info'
      );
      
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      console.log('Gas used:', receipt.gasUsed.toString());
      console.log('Effective gas price:', receipt.gasPrice ? receipt.gasPrice.toString() : 'N/A');
      
      // Parse logs to see what actually happened
      console.log('Transaction logs:', receipt.logs);
      receipt.logs.forEach((log, index) => {
        try {
          const parsed = contracts.salaryStream.interface.parseLog(log);
          console.log(`Log ${index} (SalaryStream):`, parsed.name, parsed.args);
        } catch (e) {
          // Try Treasury interface
          try {
            const parsedTreasury = contracts.treasury.interface.parseLog(log);
            console.log(`Log ${index} (Treasury):`, parsedTreasury.name, parsedTreasury.args);
          } catch (e2) {
            console.log(`Log ${index} (Unknown):`, log);
          }
        }
      });
      
      // Check Treasury balance
      const treasuryBalance = await provider.getBalance(contracts.treasury.target);
      console.log('Treasury contract balance:', ethers.formatEther(treasuryBalance), 'HLUSD');
      
      // Check balance after
      const balanceAfter = await provider.getBalance(account);
      console.log('Balance AFTER withdrawal:', ethers.formatEther(balanceAfter), 'HLUSD');
      
      const balanceChange = balanceAfter - balanceBefore;
      console.log('Balance change (including gas):', ethers.formatEther(balanceChange), 'HLUSD');
      console.log('Expected net:', ethers.formatEther(netAmount), 'HLUSD');
      
      if (balanceChange < 0n) {
        console.error('❌ ALERT: Balance DECREASED! Money was NOT transferred!');
        console.error('This likely means Treasury has insufficient HLUSD balance or transfer failed');
      }
      console.log('========================');
      
      addToast(
        `Successfully claimed ${ethers.formatEther(netAmount)} HLUSD!`,
        'success',
        tx.hash
      );
      setSuccessPulse(true);
      setTimeout(() => setSuccessPulse(false), 1000);
      fetchStream();
    } catch (err) {
      console.error('Withdraw error:', err);
      const errorMsg = err.reason || err.message || 'Withdrawal failed';
      if (errorMsg.includes('Nothing to withdraw')) {
        addToast('No earnings available to withdraw yet', 'error');
      } else {
        addToast(errorMsg, 'error');
      }
    } finally {
      setWithdrawing(false);
    }
  };

  if (!account) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🔌</div>
          <div className="empty-state-title">Connect Your Wallet</div>
          <div className="empty-state-text">
            Connect MetaMask to access the Employee Portal
          </div>
        </div>
      </div>
    );
  }

  if (!isCorrectNetwork) return null;

  return (
    <div className="dashboard">
      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>
              {t.type === 'success' && '✅ '}
              {t.type === 'error' && '❌ '}
              {t.type === 'info' && 'ℹ️ '}
              {t.message}
            </span>
            {t.txHash && (
              <a
                href={`https://testnet-blockexplorer.helachain.com/tx/${t.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="toast-link"
              >
                View TX
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="dashboard-header">
        <h1 className="dashboard-title">👤 Employee Portal</h1>
        <p className="dashboard-subtitle">
          Monitor your salary stream and claim earnings
        </p>
      </div>

      <div className="dashboard-full">
        {loading ? (
          <div className="empty-state">
            <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 1rem', borderWidth: 3 }} />
            <div className="empty-state-text">Scanning temporal streams...</div>
          </div>
        ) : !hasStream ? (
          <div className="empty-state">
            <div className="empty-state-icon">🌌</div>
            <div className="empty-state-title">No Active Time Stream Detected</div>
            <div className="empty-state-text">
              Your employer hasn't opened a salary stream for this address yet.
              <br />
              Ask your admin to create one from the Admin Console.
            </div>
          </div>
        ) : (
          <div className={successPulse ? 'success-pulse' : ''} style={{ maxWidth: 640 }}>
            <StreamCard
              stream={stream}
              account={account}
              onWithdraw={handleWithdraw}
              withdrawing={withdrawing}
            />
          </div>
        )}
      </div>
    </div>
  );
}
