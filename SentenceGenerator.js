import { cryptoRandomSource, randomInt } from './Random';
import { declineAdjective, declineNoun, Wordlist } from './Wordlist';
/** All allowed separators */
export const SEPARATORS = ['.', ',', ' ', '!', '$', '%'];
/** All allowed trailing symbols (`''` means none) */
export const TRAILING_SYMBOLS = ['!', '$', '%', ''];
/** Maximum number of trailing digits */
export const MAX_DIGITS = 6;
/** Default options: `flinkerFuchs.malt.leise.roteTomate.42!` */
export const DEFAULT_SENTENCE_OPTIONS = {
    adverb: true,
    separator: '.',
    digits: 2,
    trailingSymbol: '!'
};
/**
 * Attacker models used by {@link crackTimeEstimates}. Rates are rough,
 * order-of-magnitude figures:
 * - online throttled: a login form that allows about 100 attempts per hour;
 * - online unthrottled: a login endpoint without rate limiting, ~10 attempts/s;
 * - offline bcrypt: stolen bcrypt hashes (cost 10) on one RTX 5090, ~10^4/s;
 * - offline MD5/NTLM: stolen fast unsalted hashes on one RTX 5090, ~2*10^11/s;
 * - offline fast hash, cluster: the same on a 1000-GPU cluster, ~3*10^14/s.
 */
export const ATTACKER_MODELS = [
    { id: 'onlineThrottled', label: 'Online attack, throttled (100 guesses/hour)', guessesPerSecond: 100 / 3600 },
    { id: 'onlineUnthrottled', label: 'Online attack, unthrottled (10 guesses/s)', guessesPerSecond: 10 },
    { id: 'offlineBcrypt', label: 'Offline, bcrypt (cost 10), one RTX 5090', guessesPerSecond: 1e4 },
    { id: 'offlineFastHash', label: 'Offline, MD5/NTLM, one RTX 5090', guessesPerSecond: 2e11 },
    { id: 'offlineFastHashCluster', label: 'Offline, fast hash, 1000-GPU cluster', guessesPerSecond: 3e14 }
];
/**
 * Estimates the average time to crack a password with the given entropy for
 * each attacker model in {@link ATTACKER_MODELS}. On average an attacker who
 * knows the format must try half of the 2^bits possibilities.
 * @param bits - Entropy in bits (e.g. {@link GeneratedSentence.entropyBits})
 * @returns One estimate per attacker model
 * @throws RangeError if bits is negative or not finite
 */
export function crackTimeEstimates(bits) {
    if (!Number.isFinite(bits) || bits < 0) {
        throw new RangeError(`bits must be a finite number >= 0, got ${bits}`);
    }
    const averageGuesses = 2 ** (bits - 1);
    return ATTACKER_MODELS.map(model => ({
        ...model,
        seconds: averageGuesses / model.guessesPerSecond
    }));
}
/**
 * Generates memorable, keyboard-layout-safe German sentence passphrases:
 *
 * `flinkerFuchs.malt.leise.roteTomate.42!`
 *
 * = subject adjective (strong nominative, agreeing with the subject noun) +
 * subject noun, verb (3rd person singular), adverb, object adjective (strong
 * accusative, agreeing with the object noun) + object noun (accusative),
 * digits and a trailing symbol.
 *
 * Every word slot is chosen uniformly and independently from its list (the
 * noun's gender only selects the adjective's form), using Web Crypto and
 * rejection sampling. Because the wordlist guarantees unique decodability, the
 * entropy reported by {@link describeStrength} is exact for an attacker who
 * knows the wordlist and the options.
 */
export class SentenceGenerator {
    /**
     * Creates a new sentence generator
     * @param wordlist - Validated wordlist, or raw data to validate with {@link Wordlist.load}
     * @param rng - Random source (default: Web Crypto); inject only for tests
     * @throws WordlistError if raw wordlist data is invalid
     */
    constructor(wordlist, rng = cryptoRandomSource) {
        this.wordlist = wordlist instanceof Wordlist ? wordlist : Wordlist.load(wordlist);
        this.rng = rng;
    }
    /**
     * Generates a passphrase
     * @param options - Format options (defaults: {@link DEFAULT_SENTENCE_OPTIONS})
     * @returns The passphrase, its parts and its strength
     * @throws Error / RangeError if an option is invalid
     */
    generate(options = {}) {
        const resolved = resolveOptions(options);
        const { nouns, adjectives, verbs, adverbs } = this.wordlist;
        // Each slot is drawn independently and uniformly from its full list
        const subjectAdjective = adjectives[randomInt(adjectives.length, this.rng)];
        const subjectNoun = nouns[randomInt(nouns.length, this.rng)];
        const verb = verbs[randomInt(verbs.length, this.rng)];
        const adverb = resolved.adverb ? adverbs[randomInt(adverbs.length, this.rng)] : null;
        const objectAdjective = adjectives[randomInt(adjectives.length, this.rng)];
        const objectNoun = nouns[randomInt(nouns.length, this.rng)];
        const digits = resolved.digits > 0
            ? String(randomInt(10 ** resolved.digits, this.rng)).padStart(resolved.digits, '0')
            : '';
        const parts = {
            subjectAdjective: declineAdjective(subjectAdjective, subjectNoun.g, 'nom'),
            subjectNoun: declineNoun(subjectNoun, 'nom'),
            verb: verb.s3,
            adverb,
            objectAdjective: declineAdjective(objectAdjective, objectNoun.g, 'acc'),
            objectNoun: declineNoun(objectNoun, 'acc'),
            digits,
            trailingSymbol: resolved.trailingSymbol,
            separator: resolved.separator
        };
        const words = [
            parts.subjectAdjective + parts.subjectNoun,
            parts.verb,
            ...(parts.adverb === null ? [] : [parts.adverb]),
            parts.objectAdjective + parts.objectNoun,
            ...(digits ? [digits] : [])
        ];
        const password = words.join(resolved.separator) + resolved.trailingSymbol;
        const strength = this.describeStrength(resolved);
        return {
            password,
            parts,
            entropyBits: strength.entropyBits,
            combinations: strength.combinations
        };
    }
    /**
     * Describes the exact strength of passphrases generated with the given
     * options: entropy = sum of log2(choices) over the independently and
     * uniformly chosen slots. Separator and trailing symbol are fixed by the
     * options and add no entropy.
     * @param options - Format options (defaults: {@link DEFAULT_SENTENCE_OPTIONS})
     * @returns Per-slot breakdown, total bits and number of combinations
     * @throws Error / RangeError if an option is invalid
     */
    describeStrength(options = {}) {
        const resolved = resolveOptions(options);
        const { nouns, adjectives, verbs, adverbs } = this.wordlist;
        const choices = [
            ['subjectAdjective', adjectives.length],
            ['subjectNoun', nouns.length],
            ['verb', verbs.length]
        ];
        if (resolved.adverb) {
            choices.push(['adverb', adverbs.length]);
        }
        choices.push(['objectAdjective', adjectives.length], ['objectNoun', nouns.length]);
        if (resolved.digits > 0) {
            choices.push(['digits', 10 ** resolved.digits]);
        }
        const slots = choices.map(([slot, count]) => ({
            slot,
            choices: count,
            bits: Math.log2(count)
        }));
        return {
            slots,
            entropyBits: slots.reduce((sum, slot) => sum + slot.bits, 0),
            combinations: slots.reduce((product, slot) => product * BigInt(slot.choices), 1n)
        };
    }
}
/**
 * Applies defaults to options and validates them
 * @param options - Options given by the caller
 * @returns Complete options
 * @throws Error / RangeError if an option is invalid
 */
function resolveOptions(options) {
    const resolved = { ...DEFAULT_SENTENCE_OPTIONS, ...stripUndefined(options) };
    if (typeof resolved.adverb !== 'boolean') {
        throw new Error(`adverb must be a boolean, got ${JSON.stringify(resolved.adverb)}`);
    }
    if (!SEPARATORS.includes(resolved.separator)) {
        throw new Error(`separator must be one of ${SEPARATORS.map(s => JSON.stringify(s)).join(', ')}, ` +
            `got ${JSON.stringify(resolved.separator)}`);
    }
    if (!Number.isInteger(resolved.digits) || resolved.digits < 0 || resolved.digits > MAX_DIGITS) {
        throw new RangeError(`digits must be an integer from 0 to ${MAX_DIGITS}, got ${resolved.digits}`);
    }
    if (!TRAILING_SYMBOLS.includes(resolved.trailingSymbol)) {
        throw new Error(`trailingSymbol must be one of ${TRAILING_SYMBOLS.map(s => JSON.stringify(s)).join(', ')}, ` +
            `got ${JSON.stringify(resolved.trailingSymbol)}`);
    }
    return resolved;
}
/**
 * Removes properties whose value is undefined, so they do not override defaults
 * @param options - Options object
 * @returns Copy without undefined values
 */
function stripUndefined(options) {
    return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));
}
