import { useSyncExternalStore } from 'react'
import type { ReadableStore } from '../services/store'

/** Đọc một kho dữ liệu và tự render lại khi kho thay đổi (kể cả từ tab khác). */
export const useStore = <T>(store: ReadableStore<T>): T => useSyncExternalStore(store.subscribe, store.get)
