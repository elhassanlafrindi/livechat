import { useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'

export default function RegisterPage(): ReactElement {
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    try {
      const data = await api.register(normalizedEmail, password)
      login(data)
      navigate('/sites', { replace: true })
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Unable to create your account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="brand auth-brand">LiveChat</div>
        <section className="card auth-card" aria-labelledby="register-title">
          <h1 id="register-title">Create your account</h1>
          <p className="muted">Get started with your owner dashboard.</p>
          <form className="form" onSubmit={handleSubmit} aria-busy={submitting}>
            <div className="field">
              <label htmlFor="register-email">Email</label>
              <input id="register-email" name="email" type="email" autoComplete="email" required maxLength={254}
                value={email} onChange={event => setEmail(event.target.value)} disabled={submitting} />
            </div>
            <div className="field">
              <label htmlFor="register-password">Password</label>
              <input id="register-password" name="password" type="password" autoComplete="new-password" required minLength={8}
                aria-describedby="password-help" value={password}
                onChange={event => setPassword(event.target.value)} disabled={submitting} />
              <span id="password-help" className="field-help">At least 8 characters.</span>
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
        </section>
      </div>
    </main>
  )
}
