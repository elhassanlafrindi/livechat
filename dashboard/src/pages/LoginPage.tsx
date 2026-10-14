import { useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage(): ReactElement {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (submitting) return
    setError('')
    const normalizedEmail = email.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    setSubmitting(true)
    try {
      const data = await api.login(normalizedEmail, password)
      login(data)
      navigate('/sites', { replace: true })
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="brand auth-brand">LiveChat</div>
        <section className="card auth-card" aria-labelledby="login-title">
          <h1 id="login-title">Welcome back</h1>
          <p className="muted">Sign in to manage your websites.</p>
          <form className="form" onSubmit={handleSubmit} aria-busy={submitting}>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input id="login-email" name="email" type="email" autoComplete="email" required maxLength={254}
                value={email} onChange={event => setEmail(event.target.value)} disabled={submitting} />
            </div>
            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input id="login-password" name="password" type="password" autoComplete="current-password" required
                value={password} onChange={event => setPassword(event.target.value)} disabled={submitting} />
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="auth-footer">New to LiveChat? <Link to="/register">Create an account</Link></p>
        </section>
      </div>
    </main>
  )
}
