import css from './style.css'

export function createUi({ color, title, greeting, onOpen, onSend }) {
  const host = document.createElement('div')
  host.id = 'livechat-widget-root'
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = css
  shadow.append(style)
  host.style.setProperty('--livechat-color', color)

  function element(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  const bubble = element('button', 'bubble')
  bubble.type = 'button'
  bubble.setAttribute('aria-label', 'Open chat')
  bubble.setAttribute('aria-expanded', 'false')
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  icon.setAttribute('viewBox', '0 0 24 24')
  icon.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M20 11.5a8 8 0 0 1-8 8H4l1.7-4A8 8 0 1 1 20 11.5Z')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.8')
  icon.append(path)
  const unread = element('span', 'unread')
  unread.hidden = true
  bubble.append(icon, unread)

  const panel = element('section', 'window')
  panel.hidden = true
  panel.setAttribute('aria-label', title)
  const header = element('header', 'header')
  const heading = element('h2', '', title)
  const close = element('button', 'close', '×')
  close.type = 'button'
  close.setAttribute('aria-label', 'Close chat')
  header.append(heading, close)
  const status = element('p', 'status')
  status.hidden = true
  status.setAttribute('role', 'status')
  const messages = element('div', 'messages')
  messages.setAttribute('aria-label', 'Chat messages')
  messages.setAttribute('aria-live', 'polite')
  messages.setAttribute('aria-relevant', 'additions')
  const errorLine = element('p', 'error')
  errorLine.hidden = true
  errorLine.setAttribute('role', 'alert')
  const form = element('form', 'composer')
  const input = element('textarea')
  input.rows = 2
  input.maxLength = 2000
  input.placeholder = 'Write a message…'
  input.setAttribute('aria-label', 'Message')
  const send = element('button', 'send', 'Send')
  send.type = 'submit'
  send.setAttribute('aria-label', 'Send message')
  send.disabled = true
  form.append(input, send)
  panel.append(header, status, messages, errorLine, form)
  shadow.append(panel, bubble)
  document.body.append(host)

  let connected = false
  function updateSend() {
    send.disabled = !connected || !input.value.trim()
  }
  function showError(message) {
    errorLine.textContent = message
    errorLine.hidden = !message
  }
  function safely(action) {
    try {
      action()
    } catch (error) {
      console.warn('[LiveChat]', error)
      showError('Chat is unavailable right now')
    }
  }
  function toggle(open) {
    panel.hidden = !open
    bubble.setAttribute('aria-expanded', String(open))
    bubble.setAttribute('aria-label', open ? 'Close chat' : unread.hidden ? 'Open chat' : 'Open chat, unread message')
    if (open) {
      unread.hidden = true
      input.focus()
      messages.scrollTop = messages.scrollHeight
      onOpen()
    } else {
      bubble.focus()
    }
  }
  function submit() {
    const content = input.value.trim()
    if (!content) return
    if (!connected) {
      showError('Chat is unavailable right now')
      return
    }
    onSend(content)
    input.value = ''
    updateSend()
  }
  bubble.addEventListener('click', () => safely(() => toggle(panel.hidden)))
  close.addEventListener('click', () => safely(() => toggle(false)))
  input.addEventListener('input', updateSend)
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      safely(submit)
    }
  })
  form.addEventListener('submit', event => {
    event.preventDefault()
    safely(submit)
  })
  shadow.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault()
      event.stopPropagation()
      safely(() => toggle(false))
    }
  })

  function messageNode(content, senderType, createdAt) {
    const item = element('div', `message ${senderType === 'VISITOR' ? 'visitor' : 'owner'}`)
    item.append(element('p', 'content', content))
    if (createdAt) {
      const time = element('time', '', new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      time.dateTime = createdAt
      item.append(time)
    }
    return item
  }

  return {
    isOpen: () => !panel.hidden,
    setConnected(value) { connected = value; updateSend() },
    setStatus(text) { status.textContent = text; status.hidden = !text },
    showError,
    setUnread() {
      if (panel.hidden) {
        unread.hidden = false
        bubble.setAttribute('aria-label', 'Open chat, unread message')
      }
    },
    renderMessages(items) {
      messages.replaceChildren(...(items.length
        ? items.map(message => messageNode(message.content, message.senderType, message.createdAt))
        : [messageNode(greeting, 'OWNER')]))
      messages.scrollTop = messages.scrollHeight
    },
  }
}
