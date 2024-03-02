/**
 * Allows us to persist Sets.
 */
export const COMMON_STORAGE_OPTIONS = {
  reviver: (_key: string, value: any) => {
    if (value?._zustand_type === 'set') {
      return new Set(value.value)
    }
    return value
  },
  replacer: (_key: string, value: any) => {
    if (value instanceof Set) {
      return { _zustand_type: 'set', value: Array.from(value) }
    }
    return value
  },
}
