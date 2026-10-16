export function createApi(baseUrl) {
  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json' },
    })
    let data
    try {
      data = await response.json()
    } catch {
      throw new Error(`Invalid server response (${response.status})`)
    }
    if (!response.ok) {
      throw new Error(typeof data?.message === 'string' ? data.message : `Request failed (${response.status})`)
    }
    return data
  }

  return {
    startConversation(siteKey, visitorId) {
      return request('/api/widget/conversations', {
        method: 'POST',
        body: JSON.stringify({ siteKey, visitorId }),
      })
    },
    getHistory(conversationId, visitorId, siteKey) {
      const query = new URLSearchParams({ visitorId, siteKey })
      return request(`/api/widget/conversations/${conversationId}/messages?${query}`)
    },
  }
}
