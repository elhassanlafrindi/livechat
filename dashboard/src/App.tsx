import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import InboxPage from './pages/InboxPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SitesPage from './pages/SitesPage'

export default function App(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/sites" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/inbox" element={<InboxPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/sites" replace />} />
    </Routes>
  )
}
