const script = document.currentScript

import { createApi } from './api.js'
import { createUi } from './ui.js'
import { connectSocket } from './socket.js'

function visitorIdentity() {
  let visitorId
  try {
    visitorId = localStorage.getItem('livechat_visitor_id')
    if (visitorId) return visitorId
  } catch {
    // Storage can be blocked on a shop page; the ID below remains in memory.
  }
  try {
    visitorId = globalThis.crypto?.randomUUID?.()
  } catch {
    // randomUUID can be unavailable outside a secure context.
  }
  visitorId ||= `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`
  try {
    localStorage.setItem('livechat_visitor_id', visitorId)
  } catch {
    // Continue with this in-memory ID.
  }
  return visitorId
}

function initialize(config) {
  const visitorId = visitorIdentity()
  const api = createApi(config.apiUrl)
  let conversationId = null
  let socket = null
  let starting = false
  let historyVersion = 0
  let buffering = true
  let buffered = []
  const messages = new Map()

  const ui = createUi({ ...config,
    onOpen: () => { void start().catch(fail) },
    onSend: content => {
      if (!socket) throw new Error('Chat is disconnected')
      socket.publish(content)
    },
  })

  function fail(error) {
    console.warn('[LiveChat]', error)
    try {
      ui.showError('Chat is unavailable right now')
    } catch {
      // Never propagate widget failures into the host page.
    }
  }
  function key(message) {
    return JSON.stringify([message.createdAt, message.content, message.senderType])
  }
  function merge(items) {
    for (const message of items) {
      if (message?.conversationId !== conversationId || typeof message.content !== 'string' ||
        typeof message.createdAt !== 'string' || !['VISITOR', 'OWNER'].includes(message.senderType)) {
        throw new Error('Invalid message history')
      }
      messages.set(key(message), message)
    }
    ui.renderMessages([...messages.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
  }
  async function loadHistory() {
    const version = ++historyVersion
    buffering = true
    buffered = []
    ui.setConnected(true)
    ui.setStatus('Connecting...')
    try {
      const history = await api.getHistory(conversationId, visitorId, config.siteKey)
      if (version !== historyVersion) return
      if (!Array.isArray(history)) throw new Error('Invalid message history')
      merge([...history, ...buffered])
      buffered = []
      buffering = false
      ui.setStatus('')
      ui.showError('')
    } catch (error) {
      if (version !== historyVersion) return
      buffering = false
      if (buffered.length) {
        try { merge(buffered) } catch (mergeError) { fail(mergeError) }
      }
      buffered = []
      ui.setStatus('')
      fail(error)
    }
  }
  async function start() {
    if (starting || socket) return
    starting = true
    ui.showError('')
    ui.setStatus('Connecting...')
    try {
      const conversation = await api.startConversation(config.siteKey, visitorId)
      if (!Number.isSafeInteger(conversation?.id) || conversation.id <= 0) throw new Error('Invalid conversation response')
      conversationId = conversation.id
      socket = connectSocket({ ...config, visitorId, conversationId,
        onConnected: () => { void loadHistory().catch(fail) },
        onMessage: message => {
          if (message.senderType === 'OWNER' && !messages.has(key(message)) &&
            !buffered.some(item => key(item) === key(message))) ui.setUnread()
          if (buffering) buffered.push(message)
          else merge([message])
        },
        onDisconnected: () => {
          historyVersion++
          buffering = true
          ui.setConnected(false)
          ui.setStatus('Reconnecting...')
        },
        onError: fail,
      })
    } catch (error) {
      ui.setConnected(false)
      ui.setStatus('')
      fail(error)
    } finally {
      starting = false
    }
  }
}

try {
  if (!window.__livechatLoaded) {
    const siteKey = script?.dataset.siteKey?.trim()
    if (!siteKey) {
      console.error('[LiveChat] data-site-key is missing')
    } else {
      const color = script.dataset.color || ''
      const config = {
        siteKey,
        apiUrl: new URL(script.src).origin,
        color: /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color) ? color : '#2563eb',
        title: script.dataset.title || 'Chat with us',
        greeting: script.dataset.greeting || 'Hi! How can we help you?',
      }
      window.__livechatLoaded = true
      const ready = () => {
        try { initialize(config) } catch (error) { console.warn('[LiveChat]', error) }
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true })
      else ready()
    }
  }
} catch (error) {
  console.warn('[LiveChat]', error)
}
