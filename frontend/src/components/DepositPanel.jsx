import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';

export default function DepositPanel({ onSuccess }) {
  const { contracts } = useWallet();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    try {
      const tx = await contracts.treasury.deposit({
        value: ethers.parseEther(amount),
      });
      onSuccess?.(`Depositing... TX: ${tx.hash}`, 'info');
      await tx.wait();
      onSuccess?.(`Successfully deposited ${amount} HLUSD`, 'success', tx.hash);
      setAmount('');
    } catch (err) {
      console.error('Deposit error:', err);
      onSuccess?.(err.reason || err.message || 'Deposit failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="card-header">
        <span className="card-title">💰 Inject Temporal Funds</span>
      </div>
      <div className="form-group">
        <label className="form-label">Amount (HLUSD)</label>
        <input
          className="form-input"
          type="number"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
          min="0"
          step="0.01"
        />
        <div className="form-hint">Deposits native HLUSD into the Treasury</div>
      </div>
      <button
        className="btn btn-cyan"
        onClick={handleDeposit}
        disabled={loading || !amount || parseFloat(amount) <= 0}
      >
        {loading ? (
          <>
            <span className="spinner" />
            Processing...
          </>
        ) : (
          <>⚡ Inject Temporal Funds</>
        )}
      </button>
    </div>
  );
}
