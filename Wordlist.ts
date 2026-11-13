import { findLayoutUnsafeChars } from './LayoutSafety.js';

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
export class WordlistError extends Error {
    /** One message per offending entry or field */
    readonly issues: readonly string[];

    /**
     * @param issues - Problems found in the wordlist data
     */
    constructor(issues: readonly string[]) {
        super(`Invalid wordlist (${issues.length} issue${issues.length === 1 ? '' : 's'}):\n- ${issues.join('\n- ')}`);
        this.name = 'WordlistError';
        this.issues = issues;
    }
}

/** Expected casing of a word */
type Casing = 'capitalised' | 'lowercase';

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
export class Wordlist {
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

    private constructor(
        name: string,
        nouns: readonly NounEntry[],
        adjectives: readonly AdjEntry[],
        verbs: readonly VerbEntry[],
        adverbs: readonly string[],
        duplicates: readonly string[]
    ) {
        this.name = name;
        this.nouns = nouns;
        this.adjectives = adjectives;
        this.verbs = verbs;
        this.adverbs = adverbs;
        this.duplicates = duplicates;
    }

    /**
     * Validates and deduplicates wordlist data
     * @param data - Wordlist data, e.g. parsed JSON
     * @returns Validated wordlist
     * @throws WordlistError listing every invalid entry (wrong shape, characters
     * that are not layout safe, wrong casing, empty lists)
     */
    static load(data: unknown): Wordlist {
        const issues: string[] = [];

        if (!isRecord(data)) {
            throw new WordlistError(['wordlist data must be an object']);
        }
        if (data['version'] !== 1) {
            issues.push(`version: expected 1, got ${JSON.stringify(data['version'])}`);
        }
        const name = data['name'];
        if (typeof name !== 'string' || !name.trim()) {
            issues.push('name: must be a non-empty string');
        }

        const nouns = readEntries<NounEntry>(data, 'nouns', issues, (entry, path) => {
            const g = entry['g'];
            if (g !== 'm' && g !== 'f' && g !== 'n') {
                issues.push(`${path}.g: must be "m", "f" or "n", got ${JSON.stringify(g)}`);
            }
            const nom = readWord(entry, 'nom', path, 'capitalised', issues);
            const acc = readWord(entry, 'acc', path, 'capitalised', issues);
            return (g === 'm' || g === 'f' || g === 'n') && nom !== null && acc !== null
                ? { g, nom, acc }
                : null;
        });

        const adjectives = readEntries<AdjEntry>(data, 'adjectives', issues, (entry, path) => {
            const forms = (['base', 'm', 'f', 'n', 'accM'] as const)
                .map(field => readWord(entry, field, path, 'lowercase', issues));
            const [base, m, f, n, accM] = forms;
            return base && m && f && n && accM ? { base, m, f, n, accM } : null;
        });

        const verbs = readEntries<VerbEntry>(data, 'verbs', issues, (entry, path) => {
            const base = readWord(entry, 'base', path, 'lowercase', issues);
            const s3 = readWord(entry, 's3', path, 'lowercase', issues);
            return base && s3 ? { base, s3 } : null;
        });

        let adverbs: string[] | null = null;
        if (data['adverbs'] !== undefined) {
            if (!Array.isArray(data['adverbs'])) {
                issues.push('adverbs: must be an array of strings if present');
            } else {
                const valid: string[] = [];
                data['adverbs'].forEach((adverb: unknown, index: number) => {
                    const word = checkWord(adverb, `adverbs[${index}]`, 'lowercase', issues);
                    if (word !== null) valid.push(word);
                });
                adverbs = valid;
            }
        }

        if (issues.length) {
            throw new WordlistError(issues);
        }

        const duplicates: string[] = [];
        const uniqueNouns = dedupe(nouns, 'nouns', ['nom', 'acc'], duplicates);
        const uniqueAdjectives = dedupe(adjectives, 'adjectives', ['base', 'm', 'f', 'n', 'accM'], duplicates);
        const uniqueVerbs = dedupe(verbs, 'verbs', ['base', 's3'], duplicates);
        const uniqueAdverbs = adverbs === null
            ? uniqueAdjectives.map(adj => adj.base)
            : dedupe(adverbs.map(word => ({ word })), 'adverbs', ['word'], duplicates).map(a => a.word);

        const lists: ReadonlyArray<readonly [string, number]> = [
            ['nouns', uniqueNouns.length],
            ['adjectives', uniqueAdjectives.length],
            ['verbs', uniqueVerbs.length],
            ['adverbs', uniqueAdverbs.length]
        ];
        for (const [list, length] of lists) {
            if (length === 0) {
                issues.push(`${list}: must contain at least one entry`);
            }
        }
        if (issues.length) {
            throw new WordlistError(issues);
        }

        return new Wordlist(
            name as string,
            uniqueNouns,
            uniqueAdjectives,
            uniqueVerbs,
            uniqueAdverbs,
            duplicates
        );
    }
}

/**
 * Validates and deduplicates wordlist data; alias for {@link Wordlist.load}
 * @param data - Wordlist data, e.g. parsed JSON
 * @returns Validated wordlist
 * @throws WordlistError listing every invalid entry
 */
export function loadWordlist(data: unknown): Wordlist {
    return Wordlist.load(data);
}

/**
 * Returns the strong (article-less) form of an adjective agreeing with a noun
 * @param adjective - Adjective entry
 * @param gender - Gender of the noun
 * @param grammaticalCase - Case of the noun phrase
 * @returns Declined adjective, e.g. "flinker" (m, nom) or "flinken" (m, acc)
 */
export function declineAdjective(adjective: AdjEntry, gender: Gender, grammaticalCase: GrammaticalCase): string {
    if (gender === 'm') {
        return grammaticalCase === 'nom' ? adjective.m : adjective.accM;
    }
    return gender === 'f' ? adjective.f : adjective.n;
}

/**
 * Returns the singular form of a noun in the given case
 * @param noun - Noun entry
 * @param grammaticalCase - Case
 * @returns Noun form, e.g. "Hase" (nom) or "Hasen" (acc)
 */
export function declineNoun(noun: NounEntry, grammaticalCase: GrammaticalCase): string {
    return grammaticalCase === 'nom' ? noun.nom : noun.acc;
}

/**
 * Checks whether a value is a non-null, non-array object
 * @param value - Value to check
 * @returns True if the value can be indexed by string keys
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads and validates the entries of one list of the wordlist data
 * @param data - Wordlist data
 * @param list - Name of the list
 * @param issues - Collected issues (appended to)
 * @param parse - Validates one entry, returning null if it is invalid
 * @returns Valid entries
 */
function readEntries<T>(
    data: Record<string, unknown>,
    list: string,
    issues: string[],
    parse: (entry: Record<string, unknown>, path: string) => T | null
): T[] {
    const raw = data[list];
    if (!Array.isArray(raw)) {
        issues.push(`${list}: must be an array`);
        return [];
    }
    const result: T[] = [];
    raw.forEach((entry: unknown, index: number) => {
        const path = `${list}[${index}]`;
        if (!isRecord(entry)) {
            issues.push(`${path}: must be an object`);
            return;
        }
        const parsed = parse(entry, path);
        if (parsed !== null) result.push(parsed);
    });
    return result;
}

/**
 * Reads one word field of an entry and validates it
 * @param entry - Entry object
 * @param field - Field name
 * @param path - Path of the entry for error messages
 * @param casing - Expected casing
 * @param issues - Collected issues (appended to)
 * @returns The word, or null if it is invalid
 */
function readWord(
    entry: Record<string, unknown>,
    field: string,
    path: string,
    casing: Casing,
    issues: string[]
): string | null {
    return checkWord(entry[field], `${path}.${field}`, casing, issues);
}

/**
 * Validates a single word: type, layout safety, letters only, casing
 * @param value - Value to check
 * @param path - Path for error messages
 * @param casing - Expected casing
 * @param issues - Collected issues (appended to)
 * @returns The word, or null if it is invalid
 */
function checkWord(value: unknown, path: string, casing: Casing, issues: string[]): string | null {
    if (typeof value !== 'string' || !value) {
        issues.push(`${path}: must be a non-empty string`);
        return null;
    }
    const unsafe = findLayoutUnsafeChars(value);
    if (unsafe.length) {
        issues.push(
            `${path} ${JSON.stringify(value)}: not keyboard-layout safe ` +
            `(${unsafe.map(char => JSON.stringify(char)).join(', ')}); ` +
            'only a-x and A-X are allowed in words'
        );
        return null;
    }
    if (!/^[a-xA-X]+$/.test(value)) {
        issues.push(`${path} ${JSON.stringify(value)}: words may only contain the letters a-x and A-X`);
        return null;
    }
    const casingOk = casing === 'capitalised'
        ? /^[A-X]/.test(value)
        : /^[a-x]+$/.test(value);
    if (!casingOk) {
        issues.push(
            `${path} ${JSON.stringify(value)}: ` +
            (casing === 'capitalised' ? 'nouns must start with an uppercase letter' : 'must be all lowercase')
        );
        return null;
    }
    return value;
}

/**
 * Removes entries that share a surface form (per field) with an earlier entry
 * @param entries - Entries to deduplicate
 * @param list - Name of the list for duplicate descriptions
 * @param fields - Fields whose values must be unique within the list
 * @param duplicates - Descriptions of dropped entries (appended to)
 * @returns Entries in original order without duplicates
 */
function dedupe<T extends object, K extends keyof T & string>(
    entries: readonly T[],
    list: string,
    fields: readonly K[],
    duplicates: string[]
): T[] {
    const seen = new Map<K, Set<unknown>>(fields.map(field => [field, new Set<unknown>()]));
    const result: T[] = [];
    entries.forEach((entry, index) => {
        const clash = fields.find(field => seen.get(field)?.has(entry[field]));
        if (clash !== undefined) {
            duplicates.push(`${list}[${index}]: ${clash} ${JSON.stringify(entry[clash])} already used by an earlier entry`);
            return;
        }
        for (const field of fields) {
            seen.get(field)?.add(entry[field]);
        }
        result.push(entry);
    });
    return result;
}
