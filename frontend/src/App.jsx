import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider, useWallet } from './context/WalletContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import './styles.css';

function NetworkGuard({ children }) {
  const { account, isCorrectNetwork, switchToHela } = useWallet();

  if (account && !isCorrectNetwork) {
    return (
      <>
        {children}
        <div className="network-warning-overlay">
          <div className="network-warning-modal">
            <div className="network-warning-icon">⚠️</div>
            <h2 className="network-warning-title">Temporal Drift Detected</h2>
            <p className="network-warning-text">
              You are not connected to the HeLa Testnet.<br />
              Switch networks to access the Temporal Finance Engine.
            </p>
            <button className="network-switch-btn" onClick={switchToHela}>
              🔗 Switch to HeLa Testnet
            </button>
          </div>
        </div>
      </>
    );
  }

  return children;
}

function AppInner() {
  return (
    <NetworkGuard>
      <div className="app-background" />
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/employee" element={<EmployeeDashboard />} />
      </Routes>
    </NetworkGuard>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <AppInner />
      </WalletProvider>
    </BrowserRouter>
  );
}
