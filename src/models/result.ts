import type { Result } from './types'

export const ok = <T>(value: T): Result<T> => ({ ok: true, value })
export const fail = <T = never>(error: string): Result<T> => ({ ok: false, error })
