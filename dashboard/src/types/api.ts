export type SenderType = 'VISITOR' | 'OWNER'
export type ConversationStatus = 'OPEN' | 'CLOSED'

export interface AuthResponse {
  token: string
  userId: number
  email: string
}

export interface Site {
  id: number
  name: string
  siteKey: string
  allowedDomain: string | null
  createdAt: string
}

export interface Conversation {
  id: number
  siteId: number
  visitorId: string
  status: ConversationStatus
  createdAt: string
  lastMessageAt: string
}

export interface ChatMessage {
  conversationId: number
  senderType: SenderType
  content: string
  createdAt: string
}

export type NotificationType = 'NEW_CONVERSATION' | 'NEW_MESSAGE'

export interface Notification {
  type: NotificationType
  siteId: number
  conversationId: number
  visitorId: string
  preview: string | null
  createdAt: string
}
