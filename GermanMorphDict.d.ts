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
interface MorphAnalysis {
    lemma: string;
    category: WordCategory;
    attributes: string[];
}
interface WordEntry {
    word: string;
    analysis: MorphAnalysis;
}
export interface LoadProgress {
    totalLines: number;
    processedLines: number;
    percentage: number;
}
export interface FilterProgress {
    processedEntries: number;
    totalEntries: number;
    percentage: number;
}
export declare class GermanMorphDict {
    private dictionary;
    private totalEntries;
    private initialized;
    /**
     * Returns a promise that resolves when the dictionary is fully loaded
     */
    waitForReady(): Promise<void>;
    constructor(dictData: string | Response, progressCallback?: (progress: LoadProgress) => void);
    private loadDictFromResponse;
    private loadDict;
    private processChunk;
    private addCurrentWordToDictionary;
    filterWordsGenerator(regex?: RegExp, categories?: WordCategory[]): Generator<WordEntry, void, unknown>;
    filterWords(regex?: RegExp, categories?: WordCategory[], progressCallback?: (progress: FilterProgress) => void): Promise<WordEntry[]>;
    combineFilters(regex?: RegExp, categories?: WordCategory[], progressCallback?: (progress: FilterProgress) => void): Promise<WordEntry[]>;
    getDictionary(): Promise<WordEntry[]>;
}
export {};
