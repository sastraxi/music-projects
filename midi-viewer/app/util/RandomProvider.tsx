import { createContext } from "react"
import { XORShift64 } from "random-seedable"
import PRNG from "random-seedable/@types/PRNG"

// FIXME: generate a new random seed each time, but somehow share it.
const CONSTANT_SEED = 505

export const RandomContext = createContext<PRNG>(new XORShift64())

/**
 * Context manager that provides a seeded random number generator
 * whose seed is identical between client- and server-side.
 */
const RandomProvider = ({ children }: { children: React.ReactNode }) => {
  const value = new XORShift64(CONSTANT_SEED)
  return (
    <RandomContext.Provider value={value}>
      {children}
    </RandomContext.Provider>
  )
}

export default RandomProvider
