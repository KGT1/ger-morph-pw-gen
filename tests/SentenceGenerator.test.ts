import {
    ATTACKER_MODELS,
    crackTimeEstimates,
    DEFAULT_SENTENCE_OPTIONS,
    SentenceGenerator,
    SentenceOptions,
    SEPARATORS
} from '../SentenceGenerator';
import { isLayoutSafe } from '../LayoutSafety';
import { loadWordlist, WordlistError } from '../Wordlist';
import { ADJ, fixtureWordlist, NOUN, VERB } from './fixtures/wordlist';
import { sequenceRng } from './sequenceRng';

const UINT32_RANGE = 2 ** 32;
const N_NOUNS = fixtureWordlist.nouns.length;
const N_ADJ = fixtureWordlist.adjectives.length;
const N_VERBS = fixtureWordlist.verbs.length;
const N_ADV = N_ADJ; // adverbs default to the adjective base forms

/** Generates one passphrase from the given draws, checking all draws are used */
const generateWith = (draws: number[], options?: SentenceOptions): string => {
    const seq = sequenceRng(...draws);
    const result = new SentenceGenerator(fixtureWordlist, seq.rng).generate(options);
    expect(seq.used()).toBe(draws.length);
    return result.password;
};

/** Calls visit with every combination of indices in [0, sizes[i]) */
const forEachTuple = (sizes: readonly number[], visit: (tuple: number[]) => void): void => {
    const tuple = sizes.map(() => 0);
    while (true) {
        visit([...tuple]);
        let i = sizes.length - 1;
        while (i >= 0 && ++tuple[i]! === sizes[i]) {
            tuple[i] = 0;
            i--;
        }
        if (i < 0) return;
    }
};

describe('SentenceGenerator', () => {
    describe('format', () => {
        it('should produce the documented example', () => {
            expect(generateWith([ADJ.flink, NOUN.Fuchs, VERB.malt, ADJ.leise, ADJ.rot, NOUN.Tomate, 42]))
                .toBe('flinkerFuchs.malt.leise.roteTomate.42!');
        });

        it('should match the default format with Web Crypto', () => {
            const spy = jest.spyOn(globalThis.crypto, 'getRandomValues');
            const generator = new SentenceGenerator(fixtureWordlist);
            for (let i = 0; i < 200; i++) {
                const { password, parts } = generator.generate();
                expect(password).toMatch(/^[a-x]+[A-X][a-x]+\.[a-x]+\.[a-x]+\.[a-x]+[A-X][a-x]+\.\d{2}!$/);
                expect(isLayoutSafe(password)).toBe(true);
                expect(password).toBe(
                    `${parts.subjectAdjective}${parts.subjectNoun}.${parts.verb}.${parts.adverb}.` +
                    `${parts.objectAdjective}${parts.objectNoun}.${parts.digits}!`
                );
            }
            expect(spy).toHaveBeenCalled();
        });

        it('should return all parts', () => {
            const seq = sequenceRng(ADJ.schnell, NOUN.Hase, VERB.sieht, ADJ.flink, ADJ.leise, NOUN.Hase, 7);
            const result = new SentenceGenerator(fixtureWordlist, seq.rng).generate();
            expect(result.password).toBe('schnellerHase.sieht.flink.leisenHasen.07!');
            expect(result.parts).toEqual({
                subjectAdjective: 'schneller',
                subjectNoun: 'Hase',
                verb: 'sieht',
                adverb: 'flink',
                objectAdjective: 'leisen',
                objectNoun: 'Hasen',
                digits: '07',
                trailingSymbol: '!',
                separator: '.'
            });
        });
    });

    describe('gender agreement', () => {
        const cases: ReadonlyArray<readonly [keyof typeof NOUN, string, string]> = [
            // noun, nominative subject phrase, accusative object phrase
            ['Fuchs', 'flinkerFuchs', 'flinkenFuchs'],
            ['Hase', 'flinkerHase', 'flinkenHasen'],
            ['Tomate', 'flinkeTomate', 'flinkeTomate'],
            ['Maus', 'flinkeMaus', 'flinkeMaus'],
            ['Pferd', 'flinkesPferd', 'flinkesPferd']
        ];

        it.each(cases)('should decline adjective and noun for %s', (noun, nominative, accusative) => {
            const password = generateWith(
                [ADJ.flink, NOUN[noun], VERB.findet, ADJ.rot, ADJ.flink, NOUN[noun]],
                { digits: 0, trailingSymbol: '' }
            );
            expect(password).toBe(`${nominative}.findet.rot.${accusative}`);
        });

        it('should choose the adjective independently of the noun gender', () => {
            // Every adjective can be combined with every noun, in both positions
            const phrases = new Set<string>();
            for (let adj = 0; adj < N_ADJ; adj++) {
                for (let noun = 0; noun < N_NOUNS; noun++) {
                    const password = generateWith([adj, noun, 0, 0, adj, noun], { digits: 0, trailingSymbol: '' });
                    const [subject, , , object] = password.split('.');
                    phrases.add(`${subject}|${object}`);
                }
            }
            expect(phrases.size).toBe(N_ADJ * N_NOUNS);
        });
    });

    describe('options', () => {
        const draws = [ADJ.rot, NOUN.Maus, VERB.malt, ADJ.schnell, ADJ.leise, NOUN.Pferd];

        it('should omit the adverb in the short variant', () => {
            expect(generateWith([ADJ.rot, NOUN.Maus, VERB.malt, ADJ.leise, NOUN.Pferd, 5], { adverb: false }))
                .toBe('roteMaus.malt.leisesPferd.05!');
            const seq = sequenceRng(ADJ.rot, NOUN.Maus, VERB.malt, ADJ.leise, NOUN.Pferd, 5);
            expect(new SentenceGenerator(fixtureWordlist, seq.rng).generate({ adverb: false }).parts.adverb).toBeNull();
        });

        it.each(SEPARATORS)('should use separator %p', (separator) => {
            expect(generateWith([...draws, 12], { separator }))
                .toBe(['roteMaus', 'malt', 'schnell', 'leisesPferd', '12'].join(separator) + '!');
        });

        it('should support 0 to 6 digits, keeping leading zeros', () => {
            expect(generateWith(draws, { digits: 0 })).toBe('roteMaus.malt.schnell.leisesPferd!');
            expect(generateWith([...draws, 3], { digits: 1 })).toBe('roteMaus.malt.schnell.leisesPferd.3!');
            expect(generateWith([...draws, 7], { digits: 6 })).toBe('roteMaus.malt.schnell.leisesPferd.000007!');
            expect(generateWith([...draws, 999999], { digits: 6 })).toBe('roteMaus.malt.schnell.leisesPferd.999999!');
        });

        it.each(['!', '$', '%', ''] as const)('should use trailing symbol %p', (trailingSymbol) => {
            expect(generateWith([...draws, 1], { trailingSymbol }))
                .toBe(`roteMaus.malt.schnell.leisesPferd.01${trailingSymbol}`);
        });

        it('should treat undefined options as defaults', () => {
            const options = { separator: undefined, digits: undefined } as unknown as SentenceOptions;
            expect(generateWith([...draws, 1], options)).toBe('roteMaus.malt.schnell.leisesPferd.01!');
            expect(DEFAULT_SENTENCE_OPTIONS).toEqual({ adverb: true, separator: '.', digits: 2, trailingSymbol: '!' });
        });

        it.each([
            [{ digits: 7 }, 'digits must be an integer from 0 to 6, got 7'],
            [{ digits: -1 }, 'digits must be an integer from 0 to 6, got -1'],
            [{ digits: 1.5 }, 'digits must be an integer from 0 to 6, got 1.5'],
            [{ separator: '-' }, 'separator must be one of ".", ",", " ", "!", "$", "%", got "-"'],
            [{ separator: '' }, 'separator must be one of'],
            [{ trailingSymbol: '+' }, 'trailingSymbol must be one of "!", "$", "%", "", got "+"'],
            [{ adverb: 'yes' }, 'adverb must be a boolean, got "yes"']
        ])('should reject invalid options %p', (options, message) => {
            const generator = new SentenceGenerator(fixtureWordlist, sequenceRng().rng);
            expect(() => generator.generate(options as unknown as SentenceOptions)).toThrow(message);
            expect(() => generator.describeStrength(options as unknown as SentenceOptions)).toThrow(message);
        });
    });

    describe('wordlist input', () => {
        it('should accept a loaded Wordlist or raw data', () => {
            const loaded = loadWordlist(fixtureWordlist);
            expect(new SentenceGenerator(loaded).wordlist).toBe(loaded);
            expect(new SentenceGenerator(fixtureWordlist).wordlist.nouns).toEqual(loaded.nouns);
        });

        it('should reject invalid raw data', () => {
            expect(() => new SentenceGenerator({ ...fixtureWordlist, verbs: [{ base: 'tanzen', s3: 'tanzt' }] }))
                .toThrow(WordlistError);
        });
    });

    describe('strength', () => {
        it('should report every slot with exact choices and bits', () => {
            const report = new SentenceGenerator(fixtureWordlist).describeStrength();
            expect(report.slots).toEqual([
                { slot: 'subjectAdjective', choices: N_ADJ, bits: Math.log2(N_ADJ) },
                { slot: 'subjectNoun', choices: N_NOUNS, bits: Math.log2(N_NOUNS) },
                { slot: 'verb', choices: N_VERBS, bits: Math.log2(N_VERBS) },
                { slot: 'adverb', choices: N_ADV, bits: Math.log2(N_ADV) },
                { slot: 'objectAdjective', choices: N_ADJ, bits: Math.log2(N_ADJ) },
                { slot: 'objectNoun', choices: N_NOUNS, bits: Math.log2(N_NOUNS) },
                { slot: 'digits', choices: 100, bits: Math.log2(100) }
            ]);
            expect(report.combinations).toBe(BigInt(N_ADJ * N_NOUNS * N_VERBS * N_ADV * N_ADJ * N_NOUNS * 100));
            expect(report.entropyBits).toBeCloseTo(Math.log2(Number(report.combinations)), 10);
        });

        it.each<SentenceOptions>([
            {},
            { adverb: false },
            { digits: 0 },
            { digits: 6, separator: ' ', trailingSymbol: '' },
            { adverb: false, digits: 0 }
        ])('should satisfy combinations = product of choices and bits = log2(combinations) for %p', (options) => {
            const generator = new SentenceGenerator(fixtureWordlist);
            const report = generator.describeStrength(options);
            const product = report.slots.reduce((p, s) => p * BigInt(s.choices), 1n);
            expect(report.combinations).toBe(product);
            expect(report.entropyBits).toBeCloseTo(Math.log2(Number(product)), 10);
            expect(report.entropyBits).toBeCloseTo(report.slots.reduce((sum, s) => sum + s.bits, 0), 10);
            expect(report.slots.some(s => s.slot === 'adverb')).toBe(options.adverb !== false);
            expect(report.slots.some(s => s.slot === 'digits')).toBe(options.digits !== 0);

            const generated = generator.generate(options);
            expect(generated.entropyBits).toBe(report.entropyBits);
            expect(generated.combinations).toBe(report.combinations);
        });

        it('should not count separator or trailing symbol as entropy', () => {
            const generator = new SentenceGenerator(fixtureWordlist);
            const base = generator.describeStrength();
            expect(generator.describeStrength({ separator: '%', trailingSymbol: '' })).toEqual(base);
        });
    });

    describe('unique decodability', () => {
        it.each(SEPARATORS)('should map every choice of words to a distinct password (separator %p)', (separator) => {
            const options: SentenceOptions = { separator, digits: 0 };
            const generator = new SentenceGenerator(fixtureWordlist);
            const expected = generator.describeStrength(options).combinations;
            const passwords = new Set<string>();
            forEachTuple([N_ADJ, N_NOUNS, N_VERBS, N_ADV, N_ADJ, N_NOUNS], (tuple) => {
                const seq = sequenceRng(...tuple);
                passwords.add(new SentenceGenerator(generator.wordlist, seq.rng).generate(options).password);
            });
            expect(BigInt(passwords.size)).toBe(expected);
        });

        it('should stay injective in the short variant and with a separator equal to the symbol', () => {
            const options: SentenceOptions = { adverb: false, separator: '!', digits: 1, trailingSymbol: '!' };
            const wordlist = loadWordlist(fixtureWordlist);
            const passwords = new Set<string>();
            forEachTuple([N_ADJ, N_NOUNS, N_VERBS, N_ADJ, N_NOUNS, 10], (tuple) => {
                passwords.add(new SentenceGenerator(wordlist, sequenceRng(...tuple).rng).generate(options).password);
            });
            expect(BigInt(passwords.size)).toBe(new SentenceGenerator(wordlist).describeStrength(options).combinations);
        });

        it('should stay injective for a wordlist whose duplicates were removed', () => {
            // Without deduplication, Wetter (m/n) and the second "rot" would create
            // identical passwords from different choices
            const wordlist = loadWordlist({
                version: 1,
                name: 'dupes',
                nouns: [
                    { g: 'm', nom: 'Wetter', acc: 'Wetter' },
                    { g: 'n', nom: 'Wetter', acc: 'Wetter' },
                    { g: 'n', nom: 'Pferd', acc: 'Pferd' },
                    { g: 'm', nom: 'Hase', acc: 'Hasen' }
                ],
                adjectives: [
                    { base: 'rot', m: 'roter', f: 'rote', n: 'rotes', accM: 'roten' },
                    { base: 'rot', m: 'roter', f: 'rote', n: 'rotes', accM: 'roten' },
                    { base: 'rosa', m: 'rosa', f: 'rosa', n: 'rosa', accM: 'rosa' }
                ],
                verbs: [{ base: 'malen', s3: 'malt' }]
            });
            expect(wordlist.nouns.length).toBe(3);
            expect(wordlist.adjectives.length).toBe(2);
            const options: SentenceOptions = { digits: 0 };
            const passwords = new Set<string>();
            forEachTuple([2, 3, 1, 2, 2, 3], (tuple) => {
                passwords.add(new SentenceGenerator(wordlist, sequenceRng(...tuple).rng).generate(options).password);
            });
            expect(BigInt(passwords.size)).toBe(new SentenceGenerator(wordlist).describeStrength(options).combinations);
        });
    });

    describe('uniform sampling', () => {
        it('should map each draw value directly to the word at that index in every slot', () => {
            const wordlist = loadWordlist(fixtureWordlist);
            for (let i = 0; i < N_NOUNS; i++) {
                const parts = new SentenceGenerator(wordlist, sequenceRng(0, i, 0, 0, 0, i, 0).rng).generate().parts;
                expect(parts.subjectNoun).toBe(wordlist.nouns[i]?.nom);
                expect(parts.objectNoun).toBe(wordlist.nouns[i]?.acc);
            }
            for (let i = 0; i < N_VERBS; i++) {
                const parts = new SentenceGenerator(wordlist, sequenceRng(0, 0, i, 0, 0, 0, 0).rng).generate().parts;
                expect(parts.verb).toBe(wordlist.verbs[i]?.s3);
            }
            for (let i = 0; i < N_ADV; i++) {
                const parts = new SentenceGenerator(wordlist, sequenceRng(0, 0, 0, i, 0, 0, 0).rng).generate().parts;
                expect(parts.adverb).toBe(wordlist.adverbs[i]);
            }
        });

        it('should give every word the same number of accepted draw values', () => {
            // Draw value v selects index v % n; values from the last, incomplete
            // block [limit, 2^32) are rejected, so each index has exactly limit / n values.
            const limit = UINT32_RANGE - (UINT32_RANGE % N_NOUNS);
            const counts = new Array<number>(N_NOUNS).fill(0);
            const wordlist = loadWordlist(fixtureWordlist);
            const probe = (value: number): void => {
                const parts = new SentenceGenerator(wordlist, sequenceRng(0, value, 0, 0, 0, 0, 0).rng).generate().parts;
                counts[wordlist.nouns.findIndex(n => n.nom === parts.subjectNoun)]!++;
            };
            for (let block = 0; block < 3; block++) {
                for (let i = 0; i < N_NOUNS; i++) probe(block * N_NOUNS + i);
            }
            for (let i = 0; i < N_NOUNS; i++) probe(limit - N_NOUNS + i);
            expect(counts).toEqual(new Array(N_NOUNS).fill(4));
        });

        it('should reject draws above the limit and draw again', () => {
            const limit = UINT32_RANGE - (UINT32_RANGE % N_NOUNS);
            expect(limit).toBe(UINT32_RANGE - 1);
            // subject noun: 2^32 - 1 is rejected, the next draw (Pferd) is used
            const password = generateWith(
                [ADJ.flink, limit, NOUN.Pferd, VERB.malt, ADJ.rot, ADJ.rot, NOUN.Maus, 99],
            );
            expect(password).toBe('flinkesPferd.malt.rot.roteMaus.99!');
            // digits: 2^32 % 100 = 96, so values >= 2^32 - 96 are rejected
            const digitsLimit = UINT32_RANGE - (UINT32_RANGE % 100);
            expect(generateWith([0, 0, 0, 0, 0, 0, digitsLimit, digitsLimit - 1]))
                .toBe(`flinkerFuchs.malt.flink.flinkenFuchs.${(digitsLimit - 1) % 100}!`);
        });

        it('should be roughly uniform with Web Crypto', () => {
            const generator = new SentenceGenerator(fixtureWordlist);
            const samples = 20000;
            const counts = new Map<string, number>();
            for (let i = 0; i < samples; i++) {
                const noun = generator.generate({ digits: 0 }).parts.subjectNoun;
                counts.set(noun, (counts.get(noun) ?? 0) + 1);
            }
            expect(counts.size).toBe(N_NOUNS);
            // Expected 4000 each, sd ~57; 8 sd bounds
            for (const count of counts.values()) {
                expect(Math.abs(count - samples / N_NOUNS)).toBeLessThan(450);
            }
        });
    });
});

describe('crackTimeEstimates', () => {
    it('should document the attacker models', () => {
        expect(ATTACKER_MODELS.map(m => [m.id, m.guessesPerSecond])).toEqual([
            ['onlineThrottled', 100 / 3600],
            ['onlineUnthrottled', 10],
            ['offlineBcrypt', 1e4],
            ['offlineFastHash', 2e11],
            ['offlineFastHashCluster', 3e14]
        ]);
    });

    it('should return the average time 2^(bits-1) / rate for every model', () => {
        const estimates = crackTimeEstimates(50);
        expect(estimates.map(e => e.id)).toEqual(ATTACKER_MODELS.map(m => m.id));
        for (const estimate of estimates) {
            expect(estimate.seconds).toBeCloseTo(2 ** 49 / estimate.guessesPerSecond, 0);
        }
        expect(estimates[0]?.seconds).toBeCloseTo(2 ** 49 * 36, 0);
        expect(estimates[2]?.seconds).toBe(2 ** 49 / 1e4);
    });

    it('should handle small and fractional entropy', () => {
        expect(crackTimeEstimates(1).map(e => e.seconds)).toEqual(ATTACKER_MODELS.map(m => 1 / m.guessesPerSecond));
        expect(crackTimeEstimates(0)[1]?.seconds).toBe(0.05);
        expect(crackTimeEstimates(Math.log2(6))[1]?.seconds).toBeCloseTo(0.3, 10);
    });

    it('should double with every additional bit', () => {
        const a = crackTimeEstimates(60);
        const b = crackTimeEstimates(61);
        a.forEach((estimate, i) => expect(b[i]?.seconds).toBeCloseTo(estimate.seconds * 2, 0));
    });

    it.each([-1, NaN, Infinity])('should reject %p bits', (bits) => {
        expect(() => crackTimeEstimates(bits)).toThrow(RangeError);
    });
});
