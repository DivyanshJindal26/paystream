import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';

export default function CreateStreamForm({ onSuccess }) {
  const { contracts } = useWallet();
  const [employee, setEmployee] = useState('');
  const [salary, setSalary] = useState('');
  const [months, setMonths] = useState('');
  const [tax, setTax] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!employee || !salary || !months || tax === '') return;
    setLoading(true);
    try {
      const tx = await contracts.salaryStream.createStream(
        employee,
        ethers.parseEther(salary),
        BigInt(months),
        BigInt(tax)
      );
      onSuccess?.(`Creating stream... TX: ${tx.hash}`, 'info');
      await tx.wait();
      
      const streamData = {
        monthlySalary: ethers.parseEther(salary).toString(),
        durationMonths: months,
        taxPercent: tax,
        creationTxHash: tx.hash,
      };
      
      onSuccess?.(`Stream created for ${employee.slice(0, 6)}...${employee.slice(-4)}`, 'success', tx.hash, employee, streamData);
      setEmployee('');
      setSalary('');
      setMonths('');
      setTax('');
    } catch (err) {
      console.error('Create stream error:', err);
      onSuccess?.(err.reason || err.message || 'Failed to create stream', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="card-header">
        <span className="card-title">🌀 Open Time Stream</span>
      </div>

      <div className="form-group">
        <label className="form-label">Employee Address</label>
        <input
          className="form-input"
          type="text"
          placeholder="0x..."
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Monthly Salary (HLUSD)</label>
        <input
          className="form-input"
          type="number"
          placeholder="1000"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          disabled={loading}
          min="0"
          step="0.01"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Duration (Months)</label>
        <input
          className="form-input"
          type="number"
          placeholder="12"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          disabled={loading}
          min="1"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Tax (%)</label>
        <input
          className="form-input"
          type="number"
          placeholder="10"
          value={tax}
          onChange={(e) => setTax(e.target.value)}
          disabled={loading}
          min="0"
          max="100"
        />
        <div className="form-hint">Percentage redirected to tax vault on each withdrawal</div>
      </div>

      <button
        className="btn btn-purple"
        onClick={handleCreate}
        disabled={loading || !employee || !salary || !months || tax === ''}
      >
        {loading ? (
          <>
            <span className="spinner" />
            Opening Stream...
          </>
        ) : (
          <>🌀 Open Time Stream</>
        )}
      </button>
    </div>
  );
}
