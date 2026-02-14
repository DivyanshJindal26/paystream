import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  fetchLiveRates,
  getSignedRate,
  calculateConversion,
  isRateValid,
  formatConversionHistory
} from '../services/offRampService';

const OffRampPanel = ({ offRampContract, userAddress }) => {
  const [amount, setAmount] = useState('');
  const [liveRate, setLiveRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [estimatedINR, setEstimatedINR] = useState(null);
  const [conversionHistory, setConversionHistory] = useState([]);
  const [stats, setStats] = useState({ volume: '0', fees: '0', count: 0 });
  const [error, setError] = useState('');
  const [rateTimestamp, setRateTimestamp] = useState(null);

  // Oracle private key from environment
  const ORACLE_PRIVATE_KEY = import.meta.env.VITE_ORACLE_PRIVATE_KEY;

  // Fetch live rate on component mount and every 30 seconds
  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  // Update conversion history when contract or user changes
  useEffect(() => {
    if (offRampContract && userAddress) {
      loadConversionHistory();
      loadStats();
    }
  }, [offRampContract, userAddress]);

  // Calculate estimated INR when amount or rate changes
  useEffect(() => {
    if (amount && liveRate) {
      try {
        const result = calculateConversion(amount, liveRate.compositeRate, 1);
        setEstimatedINR(result);
      } catch (err) {
        setEstimatedINR(null);
      }
    } else {
      setEstimatedINR(null);
    }
  }, [amount, liveRate]);

  const fetchRate = async () => {
    try {
      const rates = await fetchLiveRates();
      const timestamp = Math.floor(Date.now() / 1000);
      setLiveRate(rates);
      setRateTimestamp(timestamp);
    } catch (err) {
      console.error('Error fetching rate:', err);
    }
  };

  const loadConversionHistory = async () => {
    try {
      const conversionIds = await offRampContract.getUserConversions(userAddress);
      const conversions = await Promise.all(
        conversionIds.map(id => offRampContract.getConversion(id))
      );
      setConversionHistory(formatConversionHistory(conversions));
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const loadStats = async () => {
    try {
      const [volume, fees, count] = await offRampContract.getStats();
      setStats({
        volume: ethers.formatEther(volume),
        fees: ethers.formatEther(fees),
        count: Number(count)
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleConvert = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!ORACLE_PRIVATE_KEY) {
      setError('Oracle private key not configured');
      return;
    }

    setConverting(true);
    setError('');

    try {
      // Get signed rate data
      const signedData = await getSignedRate(ORACLE_PRIVATE_KEY);

      // Verify rate is still valid
      if (!isRateValid(Number(signedData.timestamp))) {
        throw new Error('Rate expired, please try again');
      }

      // Call contract
      const tx = await offRampContract.convertToFiat(
        signedData.rate,
        signedData.timestamp,
        signedData.signature,
        {
          value: ethers.parseEther(amount)
        }
      );

      console.log('Transaction sent:', tx.hash);
      await tx.wait();

      console.log('Conversion successful!');
      setAmount('');
      setEstimatedINR(null);

      // Reload data
      await loadConversionHistory();
      await loadStats();
    } catch (err) {
      console.error('Conversion error:', err);
      setError(err.message || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const isRateFresh = rateTimestamp && isRateValid(rateTimestamp);

  return (
    <div className="offramp-panel">
      <h2>💰 HLUSD → INR OffRamp</h2>

      {/* Live Rate Display */}
      <div className="rate-display">
        <div className="rate-card">
          <div className="rate-header">
            <h3>Live Exchange Rate</h3>
            {isRateFresh && (
              <span className="verified-badge">✓ Rate Verified On-Chain</span>
            )}
          </div>
          {liveRate ? (
            <div className="rate-details">
              <div className="main-rate">
                1 HLUSD = ₹{liveRate.compositeRate.toFixed(2)}
              </div>
              <div className="rate-breakdown">
                <span>Direct conversion: HLUSD → INR</span>
              </div>
              <div className="rate-source">
                <small>Source: CoinGecko • Updated every 30s</small>
              </div>
            </div>
          ) : (
            <div className="loading">Fetching rates...</div>
          )}
        </div>
      </div>

      {/* Conversion Form */}
      <div className="conversion-form">
        <h3>Convert HLUSD to INR</h3>
        
        <div className="input-group">
          <label>Amount (HLUSD)</label>
          <input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
          />
        </div>

        {estimatedINR && (
          <div className="estimation">
            <div className="est-row">
              <span>Amount:</span>
              <span>{amount} HLUSD</span>
            </div>
            <div className="est-row">
              <span>Transaction Fee (1%):</span>
              <span>{estimatedINR.feeAmount} HLUSD</span>
            </div>
            <div className="est-row">
              <span>Net Amount:</span>
              <span>{estimatedINR.netAmount} HLUSD</span>
            </div>
            <div className="est-row total">
              <span>You Receive:</span>
              <span>₹{estimatedINR.inrAmount}</span>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <button
          onClick={handleConvert}
          disabled={converting || !amount || !liveRate}
          className="btn btn-cyan"
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {converting ? (
            <>
              <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
              Converting...
            </>
          ) : (
            '💱 Convert to INR'
          )}
        </button>
      </div>

      {/* Platform Stats */}
      <div className="platform-stats">
        <h3>Platform Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Total Volume</div>
            <div className="stat-value">{parseFloat(stats.volume).toFixed(4)} HLUSD</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Fees Collected</div>
            <div className="stat-value">{parseFloat(stats.fees).toFixed(4)} HLUSD</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Conversions</div>
            <div className="stat-value">{stats.count}</div>
          </div>
        </div>
      </div>

      {/* Conversion History */}
      {conversionHistory.length > 0 && (
        <div className="conversion-history">
          <h3>Your Conversion History</h3>
          <div className="history-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>HLUSD</th>
                  <th>INR Received</th>
                  <th>Fee</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {conversionHistory.map((conv) => (
                  <tr key={conv.id}>
                    <td>{conv.timestamp}</td>
                    <td>{parseFloat(conv.hlusdAmount).toFixed(4)}</td>
                    <td>₹{conv.inrAmount}</td>
                    <td>{parseFloat(conv.feeAmount).toFixed(4)}</td>
                    <td>₹{conv.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style jsx>{`
        .offramp-panel {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .rate-display {
          margin-bottom: 30px;
        }

        .rate-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .rate-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .rate-header h3 {
          margin: 0;
          font-size: 1.2rem;
        }

        .verified-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .main-rate {
          font-size: 2.5rem;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .rate-breakdown {
          font-size: 1rem;
          opacity: 0.9;
          margin-bottom: 10px;
        }

        .rate-source {
          opacity: 0.7;
          font-size: 0.85rem;
        }

        .conversion-form {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          margin-bottom: 30px;
        }

        .conversion-form h3 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #333;
        }

        .input-group {
          margin-bottom: 20px;
        }

        .input-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #555;
        }

        .input-group input {
          width: 100%;
          padding: 12px;
          font-size: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          transition: border-color 0.3s;
        }

        .input-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .estimation {
          background: #f8f9ff;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #e0e7ff;
        }

        .est-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 0.95rem;
        }

        .est-row.total {
          border-top: 2px solid #667eea;
          margin-top: 10px;
          padding-top: 12px;
          font-weight: bold;
          font-size: 1.1rem;
          color: #667eea;
        }

        .convert-btn {
          width: 100%;
          padding: 15px;
          font-size: 1.1rem;
          font-weight: bold;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .convert-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .convert-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 15px;
          border: 1px solid #fcc;
        }

        .platform-stats {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          margin-bottom: 30px;
        }

        .platform-stats h3 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #333;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .stat-item {
          text-align: center;
          padding: 15px;
          background: #f8f9ff;
          border-radius: 8px;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: #667eea;
        }

        .conversion-history {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .conversion-history h3 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #333;
        }

        .history-table {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #f8f9ff;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #555;
          border-bottom: 2px solid #e0e7ff;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        tbody tr:hover {
          background: #f8f9ff;
        }

        .loading {
          text-align: center;
          padding: 20px;
          font-style: italic;
          opacity: 0.7;
        }

        @media (max-width: 768px) {
          .main-rate {
            font-size: 2rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          table {
            font-size: 0.85rem;
          }

          th, td {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default OffRampPanel;
