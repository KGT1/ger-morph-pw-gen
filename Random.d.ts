/**
 * Source of uniformly distributed random 32-bit unsigned integers.
 *
 * Must fill the whole array with independent, uniformly random values, like
 * `crypto.getRandomValues`. The default implementation is
 * {@link cryptoRandomSource}; inject a deterministic source only in tests.
 */
export type RandomSource = (array: Uint32Array) => Uint32Array;
/**
 * Random source backed by `globalThis.crypto.getRandomValues`
 * (Web Crypto; available in browsers and Node.js 19+).
 * @param array - Array to fill with random values
 * @returns The same array, filled
 * @throws Error if Web Crypto is not available in the current environment
 */
export declare const cryptoRandomSource: RandomSource;
/**
 * Returns a uniformly distributed random integer in `[0, maxExclusive)`.
 *
 * Uses rejection sampling: a random draw `u` (32 bits, or 53 bits built from
 * two 32-bit values when `maxExclusive > 2^32`) is only accepted if it is below
 * the largest multiple of `maxExclusive` that fits into the draw range, so
 * `u % maxExclusive` has no modulo bias. The expected number of draws is below 2.
 *
 * @param maxExclusive - Number of possible outcomes (integer in `[1, 2^53]`)
 * @param rng - Random source (default: {@link cryptoRandomSource})
 * @returns Random integer `r` with `0 <= r < maxExclusive`
 * @throws RangeError if `maxExclusive` is not an integer in `[1, 2^53]`
 * @throws Error if the random source returns too few values
 */
export declare function randomInt(maxExclusive: number, rng?: RandomSource): number;
/**
 * Picks a uniformly random element of an array.
 * @param items - Array to pick from
 * @param rng - Random source (default: {@link cryptoRandomSource})
 * @returns Randomly chosen element
 * @throws Error if the array is empty
 */
export declare function randomChoice<T>(items: readonly T[], rng?: RandomSource): T;
