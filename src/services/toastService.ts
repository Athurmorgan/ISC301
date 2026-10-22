import { memoryStore } from './store'

export interface Toast {
  id: number
  message: string
  tone: 'default' | 'error'
  action?: { label: string; to: string }
}

export const toastStore = memoryStore<Toast[]>([])

let seq = 0

export function notify(message: string, options: Partial<Omit<Toast, 'id' | 'message'>> = {}) {
  const toast: Toast = { id: ++seq, message, tone: 'default', ...options }
  toastStore.set((list) => [...list.slice(-2), toast])
  window.setTimeout(() => dismiss(toast.id), 3800)
}

export const notifyError = (message: string) => notify(message, { tone: 'error' })

export const dismiss = (id: number) => toastStore.set((list) => list.filter((t) => t.id !== id))
