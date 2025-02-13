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
 */
export interface LoadProgress {
    /** Total number of lines to process */
    readonly totalLines: number;
    /** Number of lines processed so far */
    readonly processedLines: number;
    /** Percentage of completion (0-100) */
    readonly percentage: number;
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
     * Processes a chunk of dictionary data
     * @param chunk - String chunk of dictionary data
     * @param isLastChunk - Whether this is the final chunk
     */
    private processChunk;
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
