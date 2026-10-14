import { useCallback, useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import type { StompSubscription } from '@stomp/stompjs'
import { API_URL } from '../api/http'

export interface StompConnection {
  connected: boolean
  subscribe: <T>(destination: string, callback: (payload: T) => void) => () => void
  publish: (destination: string, body: unknown) => void
}

interface SubscriptionEntry {
  listeners: Set<(payload: unknown) => void>
  subscription: StompSubscription | null
}

function activateSubscription(client: Client, destination: string, entry: SubscriptionEntry): void {
  if (!client.connected || entry.subscription) return
  entry.subscription = client.subscribe(destination, frame => {
    let payload: unknown
    try {
      payload = JSON.parse(frame.body)
    } catch {
      return
    }
    entry.listeners.forEach(listener => listener(payload))
  })
}

export default function useStomp(token: string | undefined): StompConnection {
  const [connected, setConnected] = useState(false)
  const clientRef = useRef<Client | null>(null)
  const entries = useRef(new Map<string, SubscriptionEntry>())
  const shutdown = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    let client: Client | null = null
    setConnected(false)

    // Wait for the preceding StrictMode/token-change cleanup before opening another socket.
    void shutdown.current.then(() => {
      if (cancelled || !token || !API_URL) return
      const resetSubscriptions = (): void => {
        entries.current.forEach(entry => { entry.subscription = null })
      }
      client = new Client({
        brokerURL: `${API_URL.replace(/^http/, 'ws')}/ws/websocket`,
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        debug: () => {},
        onConnect: () => {
          if (cancelled || !client) return
          const activeClient = client
          resetSubscriptions()
          entries.current.forEach((entry, destination) => activateSubscription(activeClient, destination, entry))
          setConnected(true)
        },
        onStompError: () => {
          if (cancelled) return
          setConnected(false)
          resetSubscriptions()
          client?.forceDisconnect()
        },
        onWebSocketClose: () => {
          if (cancelled) return
          setConnected(false)
          resetSubscriptions()
        },
        onWebSocketError: () => {
          if (!cancelled) setConnected(false)
        },
      })
      clientRef.current = client
      client.activate()
    })

    return () => {
      cancelled = true
      clientRef.current = null
      entries.current.forEach(entry => { entry.subscription = null })
      if (client) shutdown.current = client.deactivate({ force: true }).catch(() => {})
    }
  }, [token])

  const subscribe = useCallback(<T>(destination: string, callback: (payload: T) => void): (() => void) => {
    let entry = entries.current.get(destination)
    if (!entry) {
      entry = { listeners: new Set(), subscription: null }
      entries.current.set(destination, entry)
    }
    const listener = (payload: unknown): void => callback(payload as T)
    entry.listeners.add(listener)
    if (clientRef.current) activateSubscription(clientRef.current, destination, entry)

    return () => {
      if (entries.current.get(destination) !== entry) return
      entry.listeners.delete(listener)
      if (entry.listeners.size === 0) {
        if (clientRef.current?.connected) entry.subscription?.unsubscribe()
        entry.subscription = null
        entries.current.delete(destination)
      }
    }
  }, [])

  const publish = useCallback((destination: string, body: unknown): void => {
    const client = clientRef.current
    if (!client?.connected) {
      setConnected(false)
      throw new Error('Disconnected, reconnecting...')
    }
    client.publish({ destination, body: JSON.stringify(body) })
  }, [])

  return { connected, subscribe, publish }
}
