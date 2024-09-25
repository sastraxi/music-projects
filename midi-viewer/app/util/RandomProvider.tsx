import { createContext } from "react"
import { XORShift64 } from "random-seedable"
import PRNG from "random-seedable/@types/PRNG"

export const RandomContext = createContext<PRNG>(new XORShift64())

// FIXME: generate on server and send down
const FIXED_SEED = 726

/**
 * Context manager that provides a seeded random number generator
 * whose seed is identical between client- and server-side.
 */
const RandomProvider = ({ children }: { children: React.ReactNode }) => {
  const value = new XORShift64(FIXED_SEED)
  return (
    <RandomContext.Provider value={value}>
      {children}
    </RandomContext.Provider>
  )
}

export default RandomProvider
