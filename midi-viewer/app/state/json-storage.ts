import { Chord } from "noteynotes"
import ESSerializer from 'esserializer'

type SerializedValue = {
  _zustand_type: string
  value: any
}

/**
 * Allows us to persist Sets.
 */
export const COMMON_STORAGE_OPTIONS = {
  reviver: (_key: string, value: any) => {
    if (value?._zustand_type === 'set') {
      return new Set(value.value)
    } else if (value?._zustand_type === 'chord') {
      return ESSerializer.deserialize(value.value, [Chord])
    }
    return value
  },
  replacer: <T>(_key: string, value: T): T | SerializedValue => {
    if (value instanceof Set) {
      return { _zustand_type: 'set', value: Array.from(value) }
    } else if (value instanceof Chord) {
      return { _zustand_type: 'chord', value: ESSerializer.serialize(value) }
    }
    return value
  },
}
