// Kho dữ liệu nhỏ có thể đăng ký theo dõi (observable), lưu vào localStorage.
// Các tab khác cập nhật theo nhờ sự kiện `storage` của trình duyệt.
// Tầng controller đọc kho này qua useSyncExternalStore.

type Listener = () => void
type Updater<T> = T | ((prev: T) => T)

export interface Store<T> {
  get(): T
  set(next: Updater<T>): void
  subscribe(listener: Listener): () => void
  reset(): void
}

const PREFIX = 'bookwise:'
const registry: Store<unknown>[] = []

function safeRead<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? undefined : (JSON.parse(raw) as T)
  } catch {
    return undefined
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Bộ nhớ đầy hoặc trình duyệt chặn localStorage: vẫn chạy được trong phiên hiện tại
  }
}

export function persistentStore<T>(name: string, initial: () => T): Store<T> {
  const key = PREFIX + name
  const listeners = new Set<Listener>()
  let value: T = safeRead<T>(key) ?? initial()

  const emit = () => listeners.forEach((l) => l())

  window.addEventListener('storage', (e) => {
    if (e.key !== key) return
    value = (e.newValue ? safeRead<T>(key) : undefined) ?? initial()
    emit()
  })

  const store: Store<T> = {
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next
      safeWrite(key, value)
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reset() {
      try {
        localStorage.removeItem(key)
      } catch {
        /* bỏ qua */
      }
      value = initial()
      emit()
    },
  }
  registry.push(store as Store<unknown>)
  return store
}

/** Kho chỉ sống trong bộ nhớ (thông báo toast...) */
export function memoryStore<T>(initial: T): Store<T> {
  const listeners = new Set<Listener>()
  let value = initial
  return {
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reset() {
      value = initial
      listeners.forEach((l) => l())
    },
  }
}

export type ReadableStore<T> = Pick<Store<T>, 'get' | 'subscribe'>

/** Kho chỉ đọc, tính từ hai kho khác; chỉ tính lại khi một trong hai thay đổi */
export function derivedStore<A, B, T>(a: ReadableStore<A>, b: ReadableStore<B>, compute: (a: A, b: B) => T): ReadableStore<T> {
  let lastA: A | undefined
  let lastB: B | undefined
  let value: T | undefined
  return {
    get() {
      const va = a.get()
      const vb = b.get()
      if (value === undefined || va !== lastA || vb !== lastB) {
        lastA = va
        lastB = vb
        value = compute(va, vb)
      }
      return value
    },
    subscribe(listener) {
      const offA = a.subscribe(listener)
      const offB = b.subscribe(listener)
      return () => {
        offA()
        offB()
      }
    },
  }
}

/** Xoá toàn bộ dữ liệu demo và nạp lại dữ liệu gốc */
export const resetAllStores = () => registry.forEach((s) => s.reset())
