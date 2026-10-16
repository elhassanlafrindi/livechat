import { Client } from '@stomp/stompjs'

export function connectSocket({ apiUrl, siteKey, visitorId, conversationId, onConnected, onMessage, onDisconnected, onError }) {
  function report(error) {
    try {
      onError(error)
    } catch (callbackError) {
      console.warn('[LiveChat]', callbackError)
    }
  }

  const client = new Client({
    brokerURL: `${apiUrl.replace(/^http/, 'ws')}/ws/websocket`,
    connectHeaders: { siteKey, visitorId },
    reconnectDelay: 5000,
    debug: () => {},
    onConnect: () => {
      try {
        // STOMP subscriptions belong to a connection; restore this topic on each reconnect.
        client.subscribe(`/topic/chat/${conversationId}`, frame => {
          try {
            const message = JSON.parse(frame.body)
            if (message?.conversationId !== conversationId || typeof message.content !== 'string' ||
              typeof message.createdAt !== 'string' || !['VISITOR', 'OWNER'].includes(message.senderType)) {
              throw new Error('Invalid chat message')
            }
            onMessage(message)
          } catch (error) {
            report(error)
          }
        })
        onConnected()
      } catch (error) {
        report(error)
        client.forceDisconnect()
      }
    },
    onStompError: frame => {
      report(new Error(frame.headers.message || 'Chat connection rejected'))
      client.forceDisconnect()
    },
    onWebSocketError: () => report(new Error('WebSocket connection failed')),
    onWebSocketClose: () => {
      try {
        onDisconnected()
      } catch (error) {
        report(error)
      }
    },
  })
  client.activate()

  return {
    publish(content) {
      if (!client.connected) throw new Error('Chat is disconnected')
      client.publish({ destination: `/app/chat/${conversationId}`, body: JSON.stringify({ content }) })
    },
  }
}
