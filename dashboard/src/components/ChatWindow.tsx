import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { api } from '../api/http'
import type { StompConnection } from '../hooks/useStomp'
import type { ChatMessage, Conversation } from '../types/api'
import MessageInput from './MessageInput'

interface ChatWindowProps extends StompConnection {
  conversation: Conversation
  onBack: () => void
  onMessage: (message: ChatMessage) => void
}

function messageKey(message: ChatMessage): string {
  return JSON.stringify([message.createdAt, message.content, message.senderType])
}

function mergeMessages(messages: ChatMessage[]): ChatMessage[] {
  const unique = new Map<string, ChatMessage>()
  messages.forEach(message => unique.set(messageKey(message), message))
  return [...unique.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export default function ChatWindow({ conversation, connected, subscribe, publish, onBack, onMessage }: ChatWindowProps): ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const messageArea = useRef<HTMLDivElement | null>(null)
  const conversationId = conversation.id

  useEffect(() => {
    let active = true
    let buffering = true
    const buffered: ChatMessage[] = []
    setLoading(true)
    setError('')

    // Register first, including while offline. Every connection reloads history to cover gaps.
    const unsubscribe = subscribe<ChatMessage>(`/topic/chat/${conversationId}`, message => {
      if (!active || message?.conversationId !== conversationId || typeof message.content !== 'string' ||
        typeof message.createdAt !== 'string' || (message.senderType !== 'OWNER' && message.senderType !== 'VISITOR')) return
      onMessage(message)
      if (buffering) buffered.push(message)
      else setMessages(previous => mergeMessages([...previous, message]))
    })

    if (connected) {
      void api.getMessages(conversationId)
        .then(history => {
          if (!active) return
          setMessages(previous => mergeMessages([...previous, ...history, ...buffered]))
          buffering = false
        })
        .catch((error: unknown) => {
          if (!active) return
          setError(error instanceof Error ? error.message : 'Unable to load messages.')
          setMessages(previous => mergeMessages([...previous, ...buffered]))
          buffering = false
        })
        .finally(() => { if (active) setLoading(false) })
    }

    return () => {
      active = false
      unsubscribe()
    }
  }, [conversationId, connected, subscribe, onMessage])

  useEffect(() => {
    const area = messageArea.current
    if (area) area.scrollTop = area.scrollHeight
  }, [messages])

  function send(content: string): void {
    publish(`/app/chat/${conversationId}`, { content })
  }

  return (
    <section className="chat-window" aria-label="Chat">
      <header className="chat-header">
        <button type="button" className="button button-secondary mobile-back" onClick={onBack}>Back</button>
        <h2>Visitor {conversation.visitorId.slice(0, 6)}</h2>
      </header>
      {error && <p className="error chat-error" role="alert">{error}</p>}
      <div className="chat-messages" ref={messageArea} aria-label="Messages" aria-live="polite" aria-relevant="additions">
        {loading && <p className="muted chat-loading" role="status">{connected ? 'Loading messages…' : 'Waiting for connection…'}</p>}
        {!loading && !error && messages.length === 0 && <p className="muted">No messages yet.</p>}
        {messages.map(message => (
          <div key={messageKey(message)} className={`chat-message ${message.senderType === 'OWNER' ? 'owner' : 'visitor'}`}>
            <span className="visually-hidden">{message.senderType === 'OWNER' ? 'You' : 'Visitor'}: </span>
            <p className="message-content">{message.content}</p>
            <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
          </div>
        ))}
      </div>
      <MessageInput connected={connected} onSend={send} />
    </section>
  )
}
