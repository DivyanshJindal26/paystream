import { useMemo } from 'react';
import { Link } from 'react-router-dom';

function Starfield() {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 4,
    }));
  }, []);

  return (
    <div className="starfield">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="page">
      <Starfield />
      <div className="landing">
        <div className="landing-hero">
          <div className="landing-badge">⏳ Temporal Finance Engine</div>
          <h1 className="landing-title">
            PayStream: Streaming Salary Through Time
          </h1>
          <p className="landing-subtitle">
            Real-time payroll powered by blockchain. Watch earnings flow every second,
            withdraw anytime, all on HeLa Testnet.
          </p>
          <div className="landing-buttons">
            <Link to="/admin" className="landing-btn landing-btn-primary">
              🏢 Enter Admin Console
            </Link>
            <Link to="/employee" className="landing-btn landing-btn-secondary">
              👤 Enter Employee Portal
            </Link>
          </div>

          <div className="landing-features">
            <div className="landing-feature">
              <div className="landing-feature-icon">⚡</div>
              <div className="landing-feature-title">Per-Second Streaming</div>
              <div className="landing-feature-text">
                Salary flows every second, not monthly
              </div>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">🔐</div>
              <div className="landing-feature-title">Treasury Custody</div>
              <div className="landing-feature-text">
                Funds secured in on-chain treasury
              </div>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">📊</div>
              <div className="landing-feature-title">Auto Tax Redirect</div>
              <div className="landing-feature-text">
                Tax deducted and redirected automatically
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
