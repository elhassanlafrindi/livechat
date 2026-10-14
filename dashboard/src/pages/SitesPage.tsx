import { useEffect, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { api, API_URL } from '../api/http'
import type { Site } from '../types/api'

function embedSnippet(site: Site): string {
  return `<script src="${API_URL}/widget.js" data-site-key="${site.siteKey}"></script>`
}

export default function SitesPage(): ReactElement {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [name, setName] = useState('')
  const [allowedDomain, setAllowedDomain] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [copyResult, setCopyResult] = useState<{ siteId: number; copied: boolean } | null>(null)

  useEffect(() => {
    let active = true
    api.getSites()
      .then(data => { if (active) setSites(data) })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load your sites.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (creating || loading) return
    setCreateError('')
    if (!name.trim()) {
      setCreateError('Enter a site name.')
      return
    }
    setCreating(true)
    try {
      const site = await api.createSite(name.trim(), allowedDomain.trim() || undefined)
      setSites(previous => [...previous, site])
      setName('')
      setAllowedDomain('')
    } catch (error: unknown) {
      setCreateError(error instanceof Error ? error.message : 'Unable to create the site.')
    } finally {
      setCreating(false)
    }
  }

  async function copySnippet(site: Site): Promise<void> {
    try {
      await navigator.clipboard.writeText(embedSnippet(site))
      setCopyResult({ siteId: site.id, copied: true })
    } catch {
      setCopyResult({ siteId: site.id, copied: false })
    }
  }

  return (
    <>
      <div className="page-heading">
        <h1>Sites</h1>
        <p className="muted">Manage your websites and copy their embed code.</p>
      </div>
      <div className="sites-grid">
        <section className="site-list" aria-label="Your sites" aria-busy={loading}>
          {loading && <div className="card state-card" role="status">Loading your sites…</div>}
          {loadError && <p className="error" role="alert">{loadError}</p>}
          {!loading && !loadError && sites.length === 0 && (
            <div className="card state-card">
              <h2>No sites yet</h2>
              <p className="muted">Create your first site to get its embed code.</p>
            </div>
          )}
          {sites.map(site => (
            <article className="card site-card" key={site.id}>
              <h2>{site.name}</h2>
              <dl className="site-details">
                <div><dt>Domain</dt><dd>{site.allowedDomain ?? 'Not set'}</dd></div>
                <div><dt>Created</dt><dd><time dateTime={site.createdAt}>{new Date(site.createdAt).toLocaleString()}</time></dd></div>
              </dl>
              <div className="snippet-heading">
                <label htmlFor={`snippet-${site.id}`}>Embed code</label>
                <button className="button button-secondary button-small" type="button" onClick={() => { void copySnippet(site) }}>
                  {copyResult?.siteId === site.id && copyResult.copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <textarea id={`snippet-${site.id}`} className="snippet" readOnly rows={3}
                value={embedSnippet(site)} onFocus={event => event.currentTarget.select()} />
              {copyResult?.siteId === site.id && (
                copyResult.copied
                  ? <p className="field-help" role="status">Embed code copied.</p>
                  : <p className="error" role="alert">Could not copy. Select the embed code and copy it manually.</p>
              )}
            </article>
          ))}
        </section>
        <section className="card create-card" aria-labelledby="create-site-title">
          <h2 id="create-site-title">Add a site</h2>
          <p className="muted">Give your website a name to get started.</p>
          <form className="form" onSubmit={handleCreate} aria-busy={creating}>
            <div className="field">
              <label htmlFor="site-name">Site name</label>
              <input id="site-name" name="name" required maxLength={100} placeholder="My shop"
                value={name} onChange={event => setName(event.target.value)} disabled={creating} />
            </div>
            <div className="field">
              <label htmlFor="site-domain">Allowed domain <span className="muted">(optional)</span></label>
              <input id="site-domain" name="allowedDomain" maxLength={253} placeholder="myshop.com"
                value={allowedDomain} onChange={event => setAllowedDomain(event.target.value)} disabled={creating} />
            </div>
            {createError && <p className="error" role="alert">{createError}</p>}
            <button className="button button-primary" type="submit" disabled={creating || loading}>
              {creating ? 'Creating site…' : 'Create site'}
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
