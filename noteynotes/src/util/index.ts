import stringify from 'fast-json-stable-stringify'

// from https://stackoverflow.com/a/43382807 then modified to use stringify
export function memoize<R, T extends (...args: any[]) => R>(f: T): T {
  const memory = new Map<string, R>();
  const g = (...args: any[]) => {
    const paramRepr = stringify(args)
    if (!memory.get(paramRepr)) {
      memory.set(paramRepr, f(...args));
    }
    return memory.get(paramRepr);
  };
  return g as T;
}

/**
 * Return 0 <= i <= array.length such that !pred(array[i - 1]) && pred(array[i]).
 * This and lowerBound / upperBound from https://stackoverflow.com/a/41956372
 */
export function binarySearch<T>(array: Array<T>, pred: (item: T) => boolean) {
  let lo = -1, hi = array.length;
  while (1 + lo < hi) {
    const mi = lo + ((hi - lo) >> 1);
    if (pred(array[mi])) {
      hi = mi;
    } else {
      lo = mi;
    }
  }
  return hi;
}
/**
 * Return i such that array[i - 1] < item <= array[i].
 */
export function lowerBound<T>(array: Array<T>, item: T) {
  return binarySearch(array, j => item <= j);
}

/**
 * Return i such that array[i - 1] <= item < array[i].
 */
export function upperBound<T>(array: Array<T>, item: T) {
  return binarySearch(array, j => item < j);
}

/**
 * Return a modified version of the given array with the element
 * at a given index replaced with a replacement element.
 */
export const withReplacement = <T,>(array: Array<T>, index: number, replacement: T) =>
  [...array.slice(0, index), replacement, ...array.slice(index + 1)]

// memoized so we don't thrash renders / recompute useCallbacks in <Choice />

/**
 * Returns the first N integers, e.g. firstNDigits(5) === [0, 1, 2, 3, 4].
 */
export const firstNDigits = memoize((n: number) => [...Array(n).keys()])

export const shortestOf = <T extends { length: number }>(arr: Array<T>): T | undefined => {
  let shortest = undefined
  for (const item of arr) {
    if (shortest === undefined || item.length < shortest.length) {
      shortest = item
    }
  }
  return shortest
}

/**
 * e.g. [4, 6, 10, 1] => [4, 10, 20, 21]
 */
export const cumulative = (arr: Readonly<Array<number>>) =>
  arr.reduce<Array<number>>(
    (workingArray, item, index) => {
      if (index === 0) {
        workingArray.push(item)
      } else {
        workingArray.push(item + workingArray[index - 1])
      }
      return workingArray
    },
    [],
  )

/**
 * e.g. [4, 6, 10, 1] => [0, 2, 6, -3]
 */
export const relativeToFirst = (arr: Readonly<Array<number>>) =>
  arr.reduce<Array<number>>(
    (workingArray, item, index) => {
      if (index === 0) {
        workingArray.push(0)
      } else {
        workingArray.push(item - arr[0])
      }
      return workingArray
    },
    [],
  )

export const unique = <T>(arr: Array<T>) =>
  arr.filter((item, index, self) => self.indexOf(item) === index)

export const range = (count: number): number[] => Array.from(Array(count).keys())

export const sum = (arr: number[]) => arr.reduce((acc, val) => acc + val, 0)

export const rotate = function<T>(arr: Array<T>, n: number) {
  n = n % arr.length;
  return arr.slice(n, arr.length).concat(arr.slice(0, n));
}

export const pairwiseMultiply = (a: number[], b: number[]) =>
  a.reduce(
    (accum, _, i) => accum + a[i] * b[i],
    0
  )
