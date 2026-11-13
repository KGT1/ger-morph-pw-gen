import { RandomSource } from '../Random';

/**
 * Deterministic random source for tests: returns the given 32-bit values in
 * order and throws once they are exhausted, so tests also verify how many
 * draws the code under test makes.
 */
export interface SequenceRng {
    readonly rng: RandomSource;
    /** Number of values handed out so far */
    readonly used: () => number;
    /** Appends further values to the sequence */
    readonly push: (...values: number[]) => void;
}

export function sequenceRng(...initial: number[]): SequenceRng {
    const values = [...initial];
    let position = 0;
    return {
        rng: (array: Uint32Array): Uint32Array => {
            for (let i = 0; i < array.length; i++) {
                const value = values[position];
                if (value === undefined) {
                    throw new Error(`sequenceRng exhausted after ${position} values`);
                }
                array[i] = value;
                position++;
            }
            return array;
        },
        used: () => position,
        push: (...more: number[]) => {
            values.push(...more);
        }
    };
}
