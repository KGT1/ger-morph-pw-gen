import { cryptoRandomSource, randomChoice, randomInt } from '../Random';
import { sequenceRng } from './sequenceRng';

const UINT32_RANGE = 2 ** 32;

describe('Random', () => {
    describe('randomInt', () => {
        it('should return the draw modulo n when it is below the rejection limit', () => {
            const seq = sequenceRng(7);
            expect(randomInt(5, seq.rng)).toBe(2);
            expect(seq.used()).toBe(1);
        });

        it.each([3, 5, 6, 10, 1000, 2 ** 31 + 1, 0xfffffffe])(
            'should accept limit-1 and reject limit for n=%d',
            (n) => {
                const limit = UINT32_RANGE - (UINT32_RANGE % n);
                // limit is a multiple of n, so [0, limit) covers each residue equally often
                expect(limit % n).toBe(0);
                expect(limit).toBeLessThan(UINT32_RANGE);

                const accepted = sequenceRng(limit - 1);
                expect(randomInt(n, accepted.rng)).toBe((limit - 1) % n);
                expect(accepted.used()).toBe(1);

                // limit and the maximum value are rejected, the next draw is used
                const rejected = sequenceRng(limit, UINT32_RANGE - 1, 4);
                expect(randomInt(n, rejected.rng)).toBe(4 % n);
                expect(rejected.used()).toBe(3);
            }
        );

        it('should never reject when n divides 2^32', () => {
            for (const n of [1, 2, 8, 2 ** 16, UINT32_RANGE]) {
                const seq = sequenceRng(UINT32_RANGE - 1);
                expect(randomInt(n, seq.rng)).toBe((UINT32_RANGE - 1) % n);
                expect(seq.used()).toBe(1);
            }
        });

        it('should combine two draws into 53 bits for n > 2^32', () => {
            const n = UINT32_RANGE + 1;
            const limit = 2 ** 53 - (2 ** 53 % n);
            expect(limit % n).toBe(0);
            /** Splits a 53-bit value into the two 32-bit draws randomInt consumes */
            const toDraws = (value: number): [number, number] =>
                [Math.floor(value / UINT32_RANGE) * 2 ** 11, value % UINT32_RANGE];

            const accepted = sequenceRng(...toDraws(limit - 1));
            expect(randomInt(n, accepted.rng)).toBe((limit - 1) % n);
            expect(accepted.used()).toBe(2);

            // Low 11 bits of the first draw are discarded
            const discarded = sequenceRng(0x7ff, 5);
            expect(randomInt(n, discarded.rng)).toBe(5);

            const rejected = sequenceRng(...toDraws(limit), 0, 9);
            expect(randomInt(n, rejected.rng)).toBe(9);
            expect(rejected.used()).toBe(4);

            const max = randomInt(2 ** 53, sequenceRng(0xffffffff, 0xffffffff).rng);
            expect(max).toBe(2 ** 53 - 1);
        });

        it('should stay in range for large n with Web Crypto', () => {
            for (let i = 0; i < 100; i++) {
                const value = randomInt(3 * UINT32_RANGE);
                expect(Number.isSafeInteger(value)).toBe(true);
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThan(3 * UINT32_RANGE);
            }
        });

        it.each([0, -1, 1.5, NaN, Infinity, 2 ** 53 + 2])(
            'should reject invalid range %p',
            (n) => {
                expect(() => randomInt(n, sequenceRng(0).rng)).toThrow(RangeError);
            }
        );

        it('should throw if the random source returns too few values', () => {
            expect(() => randomInt(3, () => new Uint32Array(0))).toThrow('Random source returned too few values');
            expect(() => randomInt(UINT32_RANGE + 1, () => new Uint32Array(1))).toThrow('Random source returned too few values');
        });

        it('should use Web Crypto by default and stay in range', () => {
            const spy = jest.spyOn(globalThis.crypto, 'getRandomValues');
            for (let i = 0; i < 1000; i++) {
                const value = randomInt(7);
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThan(7);
                expect(Number.isInteger(value)).toBe(true);
            }
            expect(spy).toHaveBeenCalled();
        });

        it('should be roughly uniform with Web Crypto', () => {
            const n = 6;
            const samples = 60000;
            const counts = new Array<number>(n).fill(0);
            for (let i = 0; i < samples; i++) {
                counts[randomInt(n)]!++;
            }
            // Expected 10000 per bucket, sd ~91; 8 sd bounds make flakes practically impossible
            for (const count of counts) {
                expect(Math.abs(count - samples / n)).toBeLessThan(750);
            }
        });
    });

    describe('randomChoice', () => {
        it('should pick the element at the drawn index', () => {
            expect(randomChoice(['a', 'b', 'c'], sequenceRng(4).rng)).toBe('b');
        });

        it('should throw for an empty array', () => {
            expect(() => randomChoice([], sequenceRng(0).rng)).toThrow('Cannot get random item from empty array');
        });
    });

    describe('cryptoRandomSource', () => {
        it('should fill the array via globalThis.crypto.getRandomValues', () => {
            const array = new Uint32Array(4);
            expect(cryptoRandomSource(array)).toBe(array);
        });

        it('should throw a clear error when Web Crypto is unavailable', () => {
            const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
            Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
            try {
                expect(() => cryptoRandomSource(new Uint32Array(1)))
                    .toThrow('globalThis.crypto.getRandomValues is not available');
            } finally {
                if (descriptor) {
                    Object.defineProperty(globalThis, 'crypto', descriptor);
                }
            }
            expect(typeof globalThis.crypto.getRandomValues).toBe('function');
        });
    });
});
