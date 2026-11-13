/** Number of distinct values a single 32-bit draw can take */
const UINT32_RANGE = 2 ** 32;
/**
 * Random source backed by `globalThis.crypto.getRandomValues`
 * (Web Crypto; available in browsers and Node.js 19+).
 * @param array - Array to fill with random values
 * @returns The same array, filled
 * @throws Error if Web Crypto is not available in the current environment
 */
export const cryptoRandomSource = (array) => {
    const webCrypto = globalThis.crypto;
    if (!webCrypto || typeof webCrypto.getRandomValues !== 'function') {
        throw new Error('globalThis.crypto.getRandomValues is not available; ' +
            'a browser or Node.js 19+ is required');
    }
    return webCrypto.getRandomValues(array);
};
/** Largest supported range: every integer below 2^53 is exactly representable */
const MAX_RANGE = 2 ** 53;
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
export function randomInt(maxExclusive, rng = cryptoRandomSource) {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > MAX_RANGE) {
        throw new RangeError(`maxExclusive must be an integer in [1, 2^53], got ${maxExclusive}`);
    }
    const wide = maxExclusive > UINT32_RANGE;
    const range = wide ? MAX_RANGE : UINT32_RANGE;
    // Exact: range is a power of two and % on doubles is exact
    const limit = range - (range % maxExclusive);
    const buffer = new Uint32Array(wide ? 2 : 1);
    while (true) {
        const values = rng(buffer);
        const high = values[0];
        const low = wide ? values[1] : 0;
        if (high === undefined || low === undefined) {
            throw new Error('Random source returned too few values');
        }
        // 53-bit draw: top 21 bits of the first value, all 32 bits of the second
        const value = wide ? (high >>> 11) * UINT32_RANGE + low : high;
        if (value < limit) {
            return value % maxExclusive;
        }
    }
}
/**
 * Picks a uniformly random element of an array.
 * @param items - Array to pick from
 * @param rng - Random source (default: {@link cryptoRandomSource})
 * @returns Randomly chosen element
 * @throws Error if the array is empty
 */
export function randomChoice(items, rng = cryptoRandomSource) {
    if (!items.length) {
        throw new Error('Cannot get random item from empty array');
    }
    // Safe: randomInt returns an index in [0, items.length)
    return items[randomInt(items.length, rng)];
}
