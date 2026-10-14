import type { ReactElement } from 'react'
import type { Conversation } from '../types/api'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: number | null
  previews: Record<number, string>
  unread: Record<number, number>
  onSelect: (conversation: Conversation) => void
}

export default function ConversationList({ conversations, selectedId, previews, unread, onSelect }: ConversationListProps): ReactElement {
  if (conversations.length === 0) {
    return <div className="inbox-empty"><p>No conversations yet.</p></div>
  }
  return (
    <ul className="conversation-list" aria-label="Conversations">
      {conversations.map(conversation => (
        <li key={conversation.id}>
          <button type="button" className={`conversation-item${selectedId === conversation.id ? ' selected' : ''}`}
            aria-pressed={selectedId === conversation.id} onClick={() => onSelect(conversation)}>
            <span className="conversation-heading">
              <strong>Visitor {conversation.visitorId.slice(0, 6)}</strong>
              {(unread[conversation.id] ?? 0) > 0 && (
                <span className="unread-badge" aria-label={`${unread[conversation.id]} unread messages`}>{unread[conversation.id]}</span>
              )}
            </span>
            <time className="conversation-time" dateTime={conversation.lastMessageAt}>
              {new Date(conversation.lastMessageAt).toLocaleString()}
            </time>
            {previews[conversation.id] !== undefined && <span className="conversation-preview">{previews[conversation.id]}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}
