import type { ReactElement } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Layout(): ReactElement {
  const { session, logout } = useAuth()

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/sites">LiveChat</Link>
          <nav className="navigation" aria-label="Main navigation">
            <NavLink className="nav-link" to="/sites">Sites</NavLink>
            <NavLink className="nav-link" to="/inbox">Inbox</NavLink>
          </nav>
          <div className="account">
            <span className="account-email">{session?.email}</span>
            <button className="button button-secondary" type="button" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>
      <main className="main-content"><Outlet /></main>
    </div>
  )
}
