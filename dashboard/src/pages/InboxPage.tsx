import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'
import ChatWindow from '../components/ChatWindow'
import ConversationList from '../components/ConversationList'
import useStomp from '../hooks/useStomp'
import type { ChatMessage, Conversation, Notification, Site } from '../types/api'

export default function InboxPage(): ReactElement {
  const { session } = useAuth()
  const { connected, subscribe, publish } = useStomp(session?.token)
  const [sites, setSites] = useState<Site[]>([])
  const [loadingSites, setLoadingSites] = useState(true)
  const [siteError, setSiteError] = useState('')
  const [siteId, setSiteId] = useState<number | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [conversationError, setConversationError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [previews, setPreviews] = useState<Record<number, string>>({})
  const [unread, setUnread] = useState<Record<number, number>>({})
  const selectedIdRef = useRef<number | null>(null)
  const reloadRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let active = true
    void api.getSites()
      .then(data => {
        if (!active) return
        setSites(data)
        setSiteId(data[0]?.id ?? null)
      })
      .catch((error: unknown) => {
        if (active) setSiteError(error instanceof Error ? error.message : 'Unable to load sites.')
      })
      .finally(() => { if (active) setLoadingSites(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (siteId === null) return
    const selectedSiteId = siteId
    let active = true
    let requestId = 0
    const knownIds = new Set<number>()
    setLoadingConversations(true)
    setConversationError('')

    function reload(): void {
      const currentRequest = ++requestId
      void api.getConversations(selectedSiteId)
        .then(data => {
          if (!active || currentRequest !== requestId) return
          knownIds.clear()
          data.forEach(conversation => knownIds.add(conversation.id))
          // Keep newer live activity if it arrived after this REST snapshot was taken.
          setConversations(previous => data.map(conversation => {
            const current = previous.find(item => item.id === conversation.id)
            return current && current.lastMessageAt > conversation.lastMessageAt
              ? { ...conversation, lastMessageAt: current.lastMessageAt }
              : conversation
          }).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)))
          setConversationError('')
        })
        .catch((error: unknown) => {
          if (active && currentRequest === requestId) {
            setConversationError(error instanceof Error ? error.message : 'Unable to load conversations.')
          }
        })
        .finally(() => {
          if (active && currentRequest === requestId) setLoadingConversations(false)
        })
    }

    const unsubscribe = subscribe<Notification>(`/topic/site/${siteId}/notifications`, notification => {
      if (!active || notification?.siteId !== selectedSiteId ||
        typeof notification.conversationId !== 'number' || typeof notification.createdAt !== 'string') return
      if (notification.type === 'NEW_CONVERSATION') {
        reload()
      } else if (notification.type === 'NEW_MESSAGE') {
        setPreviews(previous => ({ ...previous, [notification.conversationId]: notification.preview ?? '' }))
        if (selectedIdRef.current !== notification.conversationId) {
          setUnread(previous => ({ ...previous, [notification.conversationId]: (previous[notification.conversationId] ?? 0) + 1 }))
        }
        setConversations(previous => {
          const conversation = previous.find(item => item.id === notification.conversationId)
          if (!conversation) return previous
          return [{ ...conversation, lastMessageAt: notification.createdAt }, ...previous.filter(item => item.id !== conversation.id)]
        })
        // Also recovers conversations not yet present in the local list.
        if (!knownIds.has(notification.conversationId)) reload()
      }
    })
    reloadRef.current = reload
    reload()

    return () => {
      active = false
      reloadRef.current = null
      unsubscribe()
    }
  }, [siteId, subscribe])

  useEffect(() => {
    if (connected) reloadRef.current?.()
  }, [connected])

  function selectConversation(conversation: Conversation): void {
    selectedIdRef.current = conversation.id
    setSelectedId(conversation.id)
    setUnread(previous => ({ ...previous, [conversation.id]: 0 }))
  }

  function back(): void {
    selectedIdRef.current = null
    setSelectedId(null)
  }

  function selectSite(id: number): void {
    back()
    setConversations([])
    setLoadingConversations(true)
    setConversationError('')
    setSiteId(id)
  }

  const selectedConversation = conversations.find(conversation => conversation.id === selectedId) ?? null

  const updateLiveMessage = useCallback((message: ChatMessage): void => {
    setPreviews(previous => ({ ...previous, [message.conversationId]: message.content.slice(0, 50) }))
    setConversations(previous => previous.map(conversation =>
      conversation.id === message.conversationId && message.createdAt > conversation.lastMessageAt
        ? { ...conversation, lastMessageAt: message.createdAt }
        : conversation,
    ).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)))
  }, [])

  return (
    <>
      <div className="page-heading"><h1>Inbox</h1><p className="muted">Conversations with your visitors.</p></div>
      {!connected && <div className="connection-banner" role="status">Disconnected, reconnecting...</div>}
      {loadingSites ? <p role="status">Loading sites…</p> : siteError ? <p className="error" role="alert">{siteError}</p> : sites.length === 0 ? (
        <div className="card state-card"><p>No sites yet. <Link to="/sites">Create a site</Link> to start receiving conversations.</p></div>
      ) : (
        <div className={`inbox-layout${selectedConversation ? ' chat-open' : ''}`}>
          <aside className="inbox-sidebar">
            <div className="site-selector field">
              <label htmlFor="inbox-site">Site</label>
              <select id="inbox-site" value={siteId ?? ''} onChange={event => selectSite(Number(event.target.value))}>
                {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </div>
            {loadingConversations && <p className="inbox-loading" role="status">Loading conversations…</p>}
            {conversationError && <p className="error" role="alert">{conversationError}</p>}
            {!loadingConversations && !conversationError && (
              <ConversationList conversations={conversations} selectedId={selectedId} previews={previews} unread={unread} onSelect={selectConversation} />
            )}
          </aside>
          <div className="inbox-chat">
            {selectedConversation ? (
              <ChatWindow key={selectedConversation.id} conversation={selectedConversation} connected={connected}
                subscribe={subscribe} publish={publish} onBack={back} onMessage={updateLiveMessage} />
            ) : <div className="inbox-empty"><p>Select a conversation to start chatting.</p></div>}
          </div>
        </div>
      )}
    </>
  )
}
