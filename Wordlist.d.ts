/**
 * Grammatical gender of a noun: masculine, feminine or neuter
 */
export type Gender = 'm' | 'f' | 'n';
/**
 * Grammatical case used by the sentence generator: nominative (subject) or
 * accusative (object)
 */
export type GrammaticalCase = 'nom' | 'acc';
/**
 * A noun with its singular forms
 */
export interface NounEntry {
    /** Grammatical gender */
    readonly g: Gender;
    /** Nominative singular, capitalised (e.g. "Hase") */
    readonly nom: string;
    /** Accusative singular, capitalised (e.g. "Hasen" for weak masculine nouns) */
    readonly acc: string;
}
/**
 * An adjective with its strong declension forms (used without article).
 * The accusative feminine and neuter forms equal the nominative ones.
 */
export interface AdjEntry {
    /** Base (predicative) form, also used as adverb (e.g. "flink") */
    readonly base: string;
    /** Strong nominative masculine (e.g. "flinker") */
    readonly m: string;
    /** Strong nominative/accusative feminine (e.g. "flinke") */
    readonly f: string;
    /** Strong nominative/accusative neuter (e.g. "flinkes") */
    readonly n: string;
    /** Strong accusative masculine (e.g. "flinken") */
    readonly accM: string;
}
/**
 * A verb with its third person singular present form
 */
export interface VerbEntry {
    /** Infinitive (e.g. "malen") */
    readonly base: string;
    /** Third person singular present (e.g. "malt") */
    readonly s3: string;
}
/**
 * Serialisable wordlist format (e.g. stored as JSON)
 */
export interface WordlistData {
    /** Format version, currently always 1 */
    readonly version: 1;
    /** Human-readable name of the wordlist */
    readonly name: string;
    readonly nouns: readonly NounEntry[];
    readonly adjectives: readonly AdjEntry[];
    readonly verbs: readonly VerbEntry[];
    /** Adverbs; defaults to the base forms of the adjectives */
    readonly adverbs?: readonly string[];
}
/**
 * Error thrown when wordlist data is invalid. Lists every problem found.
 */
export declare class WordlistError extends Error {
    /** One message per offending entry or field */
    readonly issues: readonly string[];
    /**
     * @param issues - Problems found in the wordlist data
     */
    constructor(issues: readonly string[]);
}
/**
 * A validated, deduplicated wordlist.
 *
 * Guarantees, checked by {@link Wordlist.load}:
 * - every word consists only of keyboard-layout-safe letters (a-x, A-X; no
 *   y, z, umlauts or ß) and is typed identically on German QWERTZ and US QWERTY;
 * - nouns start with an uppercase letter, all other words are lowercase;
 * - no surface form occurs twice within the same role (e.g. two nouns with the
 *   same nominative, or two adjectives with the same masculine form). Later
 *   duplicates are dropped and listed in {@link Wordlist.duplicates}.
 *
 * Together with the separators of the sentence format this makes generated
 * passphrases uniquely decodable: every password corresponds to exactly one
 * choice of words, so the number of possible passwords equals the product of
 * the list sizes.
 */
export declare class Wordlist {
    /** Name of the wordlist */
    readonly name: string;
    /** Nouns, unique by nominative and by accusative form */
    readonly nouns: readonly NounEntry[];
    /** Adjectives, unique by each of their forms */
    readonly adjectives: readonly AdjEntry[];
    /** Verbs, unique by infinitive and by third person singular */
    readonly verbs: readonly VerbEntry[];
    /** Distinct adverbs */
    readonly adverbs: readonly string[];
    /** Descriptions of entries that were dropped as duplicates */
    readonly duplicates: readonly string[];
    private constructor();
    /**
     * Validates and deduplicates wordlist data
     * @param data - Wordlist data, e.g. parsed JSON
     * @returns Validated wordlist
     * @throws WordlistError listing every invalid entry (wrong shape, characters
     * that are not layout safe, wrong casing, empty lists)
     */
    static load(data: unknown): Wordlist;
}
/**
 * Validates and deduplicates wordlist data; alias for {@link Wordlist.load}
 * @param data - Wordlist data, e.g. parsed JSON
 * @returns Validated wordlist
 * @throws WordlistError listing every invalid entry
 */
export declare function loadWordlist(data: unknown): Wordlist;
/**
 * Returns the strong (article-less) form of an adjective agreeing with a noun
 * @param adjective - Adjective entry
 * @param gender - Gender of the noun
 * @param grammaticalCase - Case of the noun phrase
 * @returns Declined adjective, e.g. "flinker" (m, nom) or "flinken" (m, acc)
 */
export declare function declineAdjective(adjective: AdjEntry, gender: Gender, grammaticalCase: GrammaticalCase): string;
/**
 * Returns the singular form of a noun in the given case
 * @param noun - Noun entry
 * @param grammaticalCase - Case
 * @returns Noun form, e.g. "Hase" (nom) or "Hasen" (acc)
 */
export declare function declineNoun(noun: NounEntry, grammaticalCase: GrammaticalCase): string;
