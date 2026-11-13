/**
 * Enumeration of possible word categories in German morphology
 */
export declare enum WordCategory {
    VERB = "V",
    ADJECTIVE = "ADJ",
    ADVERB = "ADV",
    ARTICLE = "ART",
    CARDINAL = "CARD",
    CIRCUMPOSITION = "CIRCP",
    CONJUNCTION = "CONJ",
    DEMONSTRATIVE = "DEMO",
    INDEFINITE = "INDEF",
    INTERJECTION = "INTJ",
    ORDINAL = "ORD",
    NOUN = "NN",
    PROPER_NOUN = "NNP",
    POSSESSIVE = "POSS",
    POSTPOSITION = "POSTP",
    PRONOUN = "PRP",
    PREPOSITION = "PREP",
    PREPOSITION_ARTICLE = "PREPART",
    PRONOMINAL_ADVERB = "PROADV",
    PARTICLE = "PRTKL",
    RELATIVE = "REL",
    TRUNCATED = "TRUNC",
    VERB_PARTICLE = "VPART",
    WH_ADVERB = "WPADV",
    WH_PRONOUN = "WPRO",
    ZU = "ZU"
}
/**
 * Represents the morphological analysis of a word
 */
export interface MorphAnalysis {
    /** Base form of the word */
    readonly lemma: string;
    /** Grammatical category of the word */
    readonly category: WordCategory;
    /** Array of morphological attributes (e.g., case, number, gender) */
    readonly attributes: readonly string[];
}
/**
 * Represents a word entry in the dictionary with its morphological analysis
 */
export interface WordEntry {
    /** The word form */
    readonly word: string;
    /** Morphological analysis of the word */
    readonly analysis: MorphAnalysis;
}
/**
 * Progress information during dictionary loading
 *
 * @remarks
 * When loading from a string, `totalLines`/`processedLines` count lines.
 * When loading from a `Response`, they count bytes: `totalLines` is the
 * `content-length` header and `processedLines` the number of (decoded) body
 * bytes read so far.
 */
export interface LoadProgress {
    /** Total number of lines (string input) or bytes (Response input) to process */
    readonly totalLines: number;
    /** Number of lines (string input) or bytes (Response input) processed so far */
    readonly processedLines: number;
    /**
     * Percentage of completion (0-100). Only reaches 100 once loading has
     * finished; intermediate values are clamped to at most 99.
     */
    readonly percentage: number;
    /**
     * True if `percentage` is only a rough estimate. This is the case when the
     * response uses a `content-encoding` other than `identity` (e.g. gzip):
     * `content-length` is then the compressed size, while the body is read
     * decompressed.
     */
    readonly approximate: boolean;
}
/**
 * Progress information during word filtering
 */
export interface FilterProgress {
    /** Number of entries processed so far */
    readonly processedEntries: number;
    /** Total number of entries to process */
    readonly totalEntries: number;
    /** Percentage of completion (0-100) */
    readonly percentage: number;
}
/**
 * German morphological dictionary that provides word analysis and filtering capabilities
 */
export declare class GermanMorphDict {
    private readonly dictionary;
    private totalEntries;
    private readonly initialized;
    /** Word whose analysis lines are currently being parsed (kept across chunks) */
    private currentWord;
    /** Analyses collected so far for {@link currentWord} (kept across chunks) */
    private currentAnalyses;
    /**
     * Creates a new German morphological dictionary instance
     * @param dictData - Dictionary data as string or Response object
     * @param progressCallback - Optional callback for loading progress updates
     */
    constructor(dictData: string | Response, progressCallback?: (progress: LoadProgress) => void);
    /**
     * Waits for the dictionary to be fully loaded
     * @returns Promise that resolves when dictionary is ready
     */
    waitForReady(): Promise<void>;
    /**
     * Loads dictionary data from a Response object (e.g., fetch response)
     * @param response - Response object containing dictionary data
     * @param progressCallback - Optional callback for loading progress updates
     * @throws Error if response body is null or data is invalid
     */
    private loadDictFromResponse;
    /**
     * Loads dictionary data from a string
     * @param dictData - String containing dictionary data
     * @param progressCallback - Optional callback for loading progress updates
     */
    private loadDict;
    /**
     * Processes complete lines of dictionary data.
     *
     * Parser state ({@link currentWord}, {@link currentAnalyses}) is kept on the
     * instance, so a word whose analysis lines are split across several chunks
     * is still assembled correctly. Call {@link flushCurrentWord} after the last
     * chunk.
     *
     * @param chunk - One or more complete lines of dictionary data
     */
    private processLines;
    /**
     * Adds the word currently being parsed (if any) to the dictionary and
     * resets the parser state
     */
    private flushCurrentWord;
    /**
     * Adds a word and its analyses to the dictionary
     * @param currentWord - Word to add
     * @param currentAnalyses - Array of morphological analyses for the word
     */
    private addCurrentWordToDictionary;
    /**
     * Generator function that yields filtered word entries
     * @param regex - Optional regex pattern to filter words
     * @param categories - Optional array of word categories to filter by
     * @yields WordEntry objects matching the filter criteria
     * @remarks
     * Unlike {@link filterWords} this does not wait for loading to finish;
     * call {@link waitForReady} first. Regexes with the `g` or `y` flag are
     * supported (their `lastIndex` is reset before each word is tested).
     */
    filterWordsGenerator(regex?: RegExp, categories?: readonly WordCategory[]): Generator<WordEntry, void, unknown>;
    /**
     * Filters dictionary entries based on regex pattern and/or word categories
     * @param regex - Optional regex pattern to filter words
     * @param categories - Optional array of word categories to filter by
     * @param progressCallback - Optional callback for filtering progress updates
     * @returns Promise resolving to array of filtered word entries
     */
    filterWords(regex?: RegExp, categories?: readonly WordCategory[], progressCallback?: (progress: FilterProgress) => void): Promise<readonly WordEntry[]>;
    /**
     * Alias for filterWords method
     * @deprecated Use filterWords instead
     */
    combineFilters(regex?: RegExp, categories?: readonly WordCategory[], progressCallback?: (progress: FilterProgress) => void): Promise<readonly WordEntry[]>;
    /**
     * Gets all entries in the dictionary
     * @returns Promise resolving to array of all word entries
     */
    getDictionary(): Promise<readonly WordEntry[]>;
}
