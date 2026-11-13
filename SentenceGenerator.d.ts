import { RandomSource } from './Random.js';
import { Wordlist, WordlistData } from './Wordlist.js';
/**
 * Separators allowed between the parts of a sentence passphrase.
 * All are typed identically on German QWERTZ and US QWERTY keyboards and none
 * can occur inside a word, which keeps passphrases uniquely decodable.
 */
export type Separator = '.' | ',' | ' ' | '!' | '$' | '%';
/**
 * Symbols allowed at the end of a sentence passphrase; `''` for none
 */
export type TrailingSymbol = '!' | '$' | '%' | '';
/** All allowed separators */
export declare const SEPARATORS: readonly Separator[];
/** All allowed trailing symbols (`''` means none) */
export declare const TRAILING_SYMBOLS: readonly TrailingSymbol[];
/** Maximum number of trailing digits */
export declare const MAX_DIGITS = 6;
/**
 * Options for sentence passphrases
 */
export interface SentenceOptions {
    /** Include the adverb (default true); false gives the "short" variant */
    readonly adverb?: boolean;
    /** Separator between the parts (default '.') */
    readonly separator?: Separator;
    /** Number of random digits at the end, 0-6 (default 2) */
    readonly digits?: number;
    /** Symbol after the digits (default '!'); '' for none */
    readonly trailingSymbol?: TrailingSymbol;
}
/** Default options: `flinkerFuchs.malt.leise.roteTomate.42!` */
export declare const DEFAULT_SENTENCE_OPTIONS: Readonly<Required<SentenceOptions>>;
/**
 * Names of the independently chosen parts of a sentence passphrase
 */
export type SentenceSlot = 'subjectAdjective' | 'subjectNoun' | 'verb' | 'adverb' | 'objectAdjective' | 'objectNoun' | 'digits';
/**
 * The parts of a generated sentence passphrase, as they appear in the password
 */
export interface SentenceParts {
    /** Adjective in strong nominative, agreeing with the subject noun (e.g. "flinker") */
    readonly subjectAdjective: string;
    /** Subject noun in nominative (e.g. "Fuchs") */
    readonly subjectNoun: string;
    /** Verb in third person singular present (e.g. "malt") */
    readonly verb: string;
    /** Adverb (e.g. "leise"), or null in the short variant */
    readonly adverb: string | null;
    /** Adjective in strong accusative, agreeing with the object noun (e.g. "rote") */
    readonly objectAdjective: string;
    /** Object noun in accusative (e.g. "Tomate", "Hasen") */
    readonly objectNoun: string;
    /** Random digits (may have leading zeros; '' if digits is 0) */
    readonly digits: string;
    /** Trailing symbol ('' for none) */
    readonly trailingSymbol: TrailingSymbol;
    /** Separator used between the parts */
    readonly separator: Separator;
}
/**
 * Strength contribution of one independently chosen part
 */
export interface SlotStrength {
    /** The part */
    readonly slot: SentenceSlot;
    /** Number of equally likely choices for this part */
    readonly choices: number;
    /** Entropy contributed: log2(choices) */
    readonly bits: number;
}
/**
 * Exact strength of the passphrase format for a wordlist and options
 */
export interface StrengthReport {
    /** Per-part breakdown; parts that are switched off are omitted */
    readonly slots: readonly SlotStrength[];
    /** Total entropy in bits: sum of the slot bits = log2(combinations) */
    readonly entropyBits: number;
    /** Number of equally likely passphrases: product of the slot choices */
    readonly combinations: bigint;
}
/**
 * A generated sentence passphrase
 */
export interface GeneratedSentence {
    /** The passphrase, e.g. `flinkerFuchs.malt.leise.roteTomate.42!` */
    readonly password: string;
    /** The parts it is made of */
    readonly parts: SentenceParts;
    /** Entropy in bits (see {@link SentenceGenerator.describeStrength}) */
    readonly entropyBits: number;
    /** Number of equally likely passphrases with the same options */
    readonly combinations: bigint;
}
/**
 * An attacker model for crack time estimates
 */
export interface AttackerModel {
    /** Stable identifier */
    readonly id: string;
    /** Human-readable description */
    readonly label: string;
    /** Guesses per second */
    readonly guessesPerSecond: number;
}
/**
 * Attacker models used by {@link crackTimeEstimates}. Rates are rough,
 * order-of-magnitude figures:
 * - online throttled: a login form that allows about 100 attempts per hour;
 * - online unthrottled: a login endpoint without rate limiting, ~10 attempts/s;
 * - offline bcrypt: stolen bcrypt hashes (cost 10) on one RTX 5090, ~10^4/s;
 * - offline MD5/NTLM: stolen fast unsalted hashes on one RTX 5090, ~2*10^11/s;
 * - offline fast hash, cluster: the same on a 1000-GPU cluster, ~3*10^14/s.
 */
export declare const ATTACKER_MODELS: readonly AttackerModel[];
/**
 * Average time to guess a password for one attacker model
 */
export interface CrackTimeEstimate extends AttackerModel {
    /** Average seconds until the password is found: 2^(bits-1) / guessesPerSecond */
    readonly seconds: number;
}
/**
 * Estimates the average time to crack a password with the given entropy for
 * each attacker model in {@link ATTACKER_MODELS}. On average an attacker who
 * knows the format must try half of the 2^bits possibilities.
 * @param bits - Entropy in bits (e.g. {@link GeneratedSentence.entropyBits})
 * @returns One estimate per attacker model
 * @throws RangeError if bits is negative or not finite
 */
export declare function crackTimeEstimates(bits: number): CrackTimeEstimate[];
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
export declare class SentenceGenerator {
    /** The validated wordlist */
    readonly wordlist: Wordlist;
    private readonly rng;
    /**
     * Creates a new sentence generator
     * @param wordlist - Validated wordlist, or raw data to validate with {@link Wordlist.load}
     * @param rng - Random source (default: Web Crypto); inject only for tests
     * @throws WordlistError if raw wordlist data is invalid
     */
    constructor(wordlist: Wordlist | WordlistData, rng?: RandomSource);
    /**
     * Generates a passphrase
     * @param options - Format options (defaults: {@link DEFAULT_SENTENCE_OPTIONS})
     * @returns The passphrase, its parts and its strength
     * @throws Error / RangeError if an option is invalid
     */
    generate(options?: SentenceOptions): GeneratedSentence;
    /**
     * Describes the exact strength of passphrases generated with the given
     * options: entropy = sum of log2(choices) over the independently and
     * uniformly chosen slots. Separator and trailing symbol are fixed by the
     * options and add no entropy.
     * @param options - Format options (defaults: {@link DEFAULT_SENTENCE_OPTIONS})
     * @returns Per-slot breakdown, total bits and number of combinations
     * @throws Error / RangeError if an option is invalid
     */
    describeStrength(options?: SentenceOptions): StrengthReport;
}
