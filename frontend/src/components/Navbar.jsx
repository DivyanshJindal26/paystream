import { NavLink, Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import ConnectWallet from './ConnectWallet';

export default function Navbar() {
  const { account } = useWallet();
  const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase();
  const isAdmin = account && adminAddress && account.toLowerCase() === adminAddress;
  
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-logo">⏳</span>
        <span className="navbar-title">PayStream</span>
      </Link>

      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
          Admin Console
        </NavLink>
        <NavLink to="/employee" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
          Employee Portal
        </NavLink>
        {isAdmin && (
          <NavLink to="/logs" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
            📊 Logs
          </NavLink>
        )}
      </div>

      <div className="navbar-right">
        <ConnectWallet />
      </div>
    </nav>
  );
}
