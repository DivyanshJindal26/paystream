import { NavLink, Link } from 'react-router-dom';
import ConnectWallet from './ConnectWallet';

export default function Navbar() {
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
      </div>

      <div className="navbar-right">
        <ConnectWallet />
      </div>
    </nav>
  );
}
