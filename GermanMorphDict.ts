/**
 * Enumeration of possible word categories in German morphology
 */
export enum WordCategory {
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
    ZU = "ZU",
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
export class GermanMorphDict {
    private readonly dictionary: Map<string, readonly WordEntry[]> = new Map();
    private totalEntries: number = 0;
    private readonly initialized: Promise<void>;

    /**
     * Creates a new German morphological dictionary instance
     * @param dictData - Dictionary data as string or Response object
     * @param progressCallback - Optional callback for loading progress updates
     */
    constructor(
        dictData: string | Response,
        progressCallback?: (progress: LoadProgress) => void
    ) {
        this.initialized = (async () => {
            if (dictData instanceof Response) {
                await this.loadDictFromResponse(dictData, progressCallback);
            } else {
                this.loadDict(dictData, progressCallback);
            }
        })();
    }

    /**
     * Waits for the dictionary to be fully loaded
     * @returns Promise that resolves when dictionary is ready
     */
    public async waitForReady(): Promise<void> {
        await this.initialized;
    }

    /**
     * Loads dictionary data from a Response object (e.g., fetch response)
     * @param response - Response object containing dictionary data
     * @param progressCallback - Optional callback for loading progress updates
     * @throws Error if response body is null or data is invalid
     */
    private async loadDictFromResponse(
        response: Response,
        progressCallback?: (progress: LoadProgress) => void
    ): Promise<void> {
        if (!response.body) {
            throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const totalBytes = Number(response.headers.get('content-length') || 0);
        let loadedBytes = 0;

        try {
            while (true) {
                const {done, value} = await reader.read();
                
                if (done) {
                    this.processChunk(buffer, true);
                    break;
                }

                loadedBytes += value.length;
                buffer += decoder.decode(value, {stream: true});

                const lastNewline = buffer.lastIndexOf('\n');
                if (lastNewline !== -1) {
                    const completeLines = buffer.slice(0, lastNewline);
                    buffer = buffer.slice(lastNewline + 1);
                    this.processChunk(completeLines, false);
                }

                if (progressCallback && totalBytes > 0) {
                    progressCallback({
                        totalLines: totalBytes,
                        processedLines: loadedBytes,
                        percentage: (loadedBytes / totalBytes) * 100
                    });
                }
            }

            if (progressCallback) {
                progressCallback({
                    totalLines: totalBytes,
                    processedLines: totalBytes,
                    percentage: 100
                });
            }
        } catch (error) {
            throw new Error(`Failed to load dictionary: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Loads dictionary data from a string
     * @param dictData - String containing dictionary data
     * @param progressCallback - Optional callback for loading progress updates
     */
    private loadDict(
        dictData: string,
        progressCallback?: (progress: LoadProgress) => void
    ): void {
        this.processChunk(dictData, true);
        
        const totalLines = dictData.split('\n').length;
        if (progressCallback) {
            progressCallback({
                totalLines,
                processedLines: totalLines,
                percentage: 100
            });
        }
    }

    /**
     * Processes a chunk of dictionary data
     * @param chunk - String chunk of dictionary data
     * @param isLastChunk - Whether this is the final chunk
     */
    private processChunk(chunk: string, isLastChunk: boolean): void {
        const lines = chunk.split('\n');
        let currentWord: string | null = null;
        let currentAnalyses: MorphAnalysis[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (!trimmedLine.includes(",")) {
                this.addCurrentWordToDictionary(currentWord, currentAnalyses);
                currentWord = trimmedLine;
                currentAnalyses = [];
            } else {
                const parts = trimmedLine.split(" ");
                if (parts.length < 2) continue;

                const lemma = parts[0];
                if (!lemma) continue;

                const analysis = parts[1];
                if (!analysis) continue;

                const analysisParts = analysis.split(",");
                if (!analysisParts.length) continue;

                const category = analysisParts[0];
                if (!Object.values(WordCategory).includes(category as WordCategory)) continue;

                currentAnalyses.push({
                    lemma,
                    category: category as WordCategory,
                    attributes: analysisParts.slice(1)
                });
            }
        }

        if (isLastChunk) {
            this.addCurrentWordToDictionary(currentWord, currentAnalyses);
        }
    }

    /**
     * Adds a word and its analyses to the dictionary
     * @param currentWord - Word to add
     * @param currentAnalyses - Array of morphological analyses for the word
     */
    private addCurrentWordToDictionary(
        currentWord: string | null,
        currentAnalyses: readonly MorphAnalysis[]
    ): void {
        if (currentWord && currentAnalyses.length > 0) {
            const entries = currentAnalyses.map(analysis => ({
                word: currentWord,
                analysis
            }));
            this.dictionary.set(currentWord, entries);
            this.totalEntries += entries.length;
        }
    }

    /**
     * Generator function that yields filtered word entries
     * @param regex - Optional regex pattern to filter words
     * @param categories - Optional array of word categories to filter by
     * @yields WordEntry objects matching the filter criteria
     */
    *filterWordsGenerator(
        regex?: RegExp,
        categories?: readonly WordCategory[]
    ): Generator<WordEntry, void, unknown> {
        for (const [word, entries] of this.dictionary) {
            if (regex && !regex.test(word)) continue;
            
            for (const entry of entries) {
                if (!categories || categories.includes(entry.analysis.category)) {
                    yield entry;
                }
            }
        }
    }

    /**
     * Filters dictionary entries based on regex pattern and/or word categories
     * @param regex - Optional regex pattern to filter words
     * @param categories - Optional array of word categories to filter by
     * @param progressCallback - Optional callback for filtering progress updates
     * @returns Promise resolving to array of filtered word entries
     */
    async filterWords(
        regex?: RegExp,
        categories?: readonly WordCategory[],
        progressCallback?: (progress: FilterProgress) => void
    ): Promise<readonly WordEntry[]> {
        await this.initialized;
        const result: WordEntry[] = [];
        const generator = this.filterWordsGenerator(regex, categories);
        let processedEntries = 0;

        for (const entry of generator) {
            result.push(entry);
            processedEntries++;

            if (progressCallback && processedEntries % 1000 === 0) {
                progressCallback({
                    processedEntries,
                    totalEntries: this.totalEntries,
                    percentage: (processedEntries / this.totalEntries) * 100
                });
            }
        }

        if (progressCallback) {
            progressCallback({
                processedEntries: this.totalEntries,
                totalEntries: this.totalEntries,
                percentage: 100
            });
        }

        return result;
    }

    /**
     * Alias for filterWords method
     * @deprecated Use filterWords instead
     */
    async combineFilters(
        regex?: RegExp,
        categories?: readonly WordCategory[],
        progressCallback?: (progress: FilterProgress) => void
    ): Promise<readonly WordEntry[]> {
        return this.filterWords(regex, categories, progressCallback);
    }

    /**
     * Gets all entries in the dictionary
     * @returns Promise resolving to array of all word entries
     */
    async getDictionary(): Promise<readonly WordEntry[]> {
        await this.initialized;
        const result: WordEntry[] = [];
        for (const entries of this.dictionary.values()) {
            result.push(...entries);
        }
        return result;
    }
}
