/**
 * BookWise Backend API Client
 * Hỗ trợ giao tiếp trực tiếp với Backend REST API qua URL và API Key
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
export const DEFAULT_API_KEY = import.meta.env.VITE_API_KEY || 'bw-client-api-key-2026'

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (!headers.has('x-api-key') && DEFAULT_API_KEY) {
    headers.set('x-api-key', DEFAULT_API_KEY)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || `Lỗi máy chủ (${response.status})`)
  }
  return data
}

export const api = {
  // Luồng 1: CSKH + Dashboard + Giao hàng
  support: {
    getTickets: (query?: string) => request<any>(`/api/support/tickets${query ? `?${query}` : ''}`),
    getTicket: (code: string) => request<any>(`/api/support/tickets/${code}`),
    createTicket: (payload: any) => request<any>('/api/support/tickets', { method: 'POST', body: JSON.stringify(payload) }),
    replyTicket: (code: string, payload: any) =>
      request<any>(`/api/support/tickets/${code}/reply`, { method: 'PATCH', body: JSON.stringify(payload) }),
    getFaqs: () => request<any>('/api/support/faqs'),
    getReviews: (bookId?: string) => request<any>(`/api/support/reviews${bookId ? `?bookId=${bookId}` : ''}`),
    createReview: (payload: any) => request<any>('/api/support/reviews', { method: 'POST', body: JSON.stringify(payload) }),
  },
  dashboard: {
    getSummary: () => request<any>('/api/dashboard/summary'),
    getRevenueTrend: () => request<any>('/api/dashboard/revenue-trend'),
    getTopBooks: () => request<any>('/api/dashboard/top-books'),
    getInventoryAlerts: () => request<any>('/api/dashboard/inventory-alerts'),
    getLive: () => request<any>('/api/dashboard/live'),
  },
  delivery: {
    getMethods: () => request<any>('/api/delivery/methods'),
    getCarriers: () => request<any>('/api/delivery/carriers'),
    track: (trackingCode: string) => request<any>(`/api/delivery/track/${trackingCode}`),
    dispatch: (payload: any) => request<any>('/api/delivery/dispatch', { method: 'POST', body: JSON.stringify(payload) }),
    updateStatus: (payload: any) => request<any>('/api/delivery/update-status', { method: 'POST', body: JSON.stringify(payload) }),
  },

  // Luồng 2: Mua bán sách & Giao dịch
  books: {
    list: (query?: string) => request<any>(`/api/books${query ? `?${query}` : ''}`),
    get: (id: string) => request<any>(`/api/books/${id}`),
    categories: () => request<any>('/api/books/categories'),
  },
  orders: {
    calculateCart: (payload: any) => request<any>('/api/orders/calculate-cart', { method: 'POST', body: JSON.stringify(payload) }),
    applyCoupon: (payload: any) => request<any>('/api/orders/apply-coupon', { method: 'POST', body: JSON.stringify(payload) }),
    checkout: (payload: any) => request<any>('/api/orders/checkout', { method: 'POST', body: JSON.stringify(payload) }),
    processPayment: (payload: any) => request<any>('/api/orders/process-payment', { method: 'POST', body: JSON.stringify(payload) }),
  },
  buyback: {
    estimate: (payload: any) => request<any>('/api/buybacks/estimate', { method: 'POST', body: JSON.stringify(payload) }),
    create: (payload: any) => request<any>('/api/buybacks', { method: 'POST', body: JSON.stringify(payload) }),
    list: (query?: string) => request<any>(`/api/buybacks${query ? `?${query}` : ''}`),
    get: (code: string) => request<any>(`/api/buybacks/${code}`),
  },

  // Luồng 3: Theo dõi đơn hàng
  tracking: {
    trackOrder: (code: string) => request<any>(`/api/orders/track/${code}`),
    lookup: (payload: { phone?: string; email?: string }) =>
      request<any>('/api/orders/lookup', { method: 'POST', body: JSON.stringify(payload) }),
    cancelOrder: (code: string, reason?: string) =>
      request<any>(`/api/orders/${code}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    myOrders: () => request<any>('/api/orders/my-orders'),
  },
}
