import { useState } from 'react'
import type { FormEvent, ReactElement } from 'react'

interface MessageInputProps {
  connected: boolean
  onSend: (content: string) => void
}

export default function MessageInput({ connected, onSend }: MessageInputProps): ReactElement {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  function send(): void {
    const content = text.trim()
    if (!connected || !content) return
    try {
      onSend(content)
      setText('')
      setError('')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Message was not sent. Please try again.')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    send()
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor="message-text">Message</label>
      <textarea id="message-text" rows={3} maxLength={2000} placeholder="Write a message…"
        value={text} onChange={event => setText(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            send()
          }
        }} />
      <div className="message-input-footer">
        <span className="field-help">Enter to send · Shift+Enter for a new line</span>
        <button className="button button-primary" type="submit" disabled={!connected || !text.trim()}>Send</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  )
}
