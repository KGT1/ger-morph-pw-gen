/**
 * Enumeration of possible word categories in German morphology
 */
export var WordCategory;
(function (WordCategory) {
    WordCategory["VERB"] = "V";
    WordCategory["ADJECTIVE"] = "ADJ";
    WordCategory["ADVERB"] = "ADV";
    WordCategory["ARTICLE"] = "ART";
    WordCategory["CARDINAL"] = "CARD";
    WordCategory["CIRCUMPOSITION"] = "CIRCP";
    WordCategory["CONJUNCTION"] = "CONJ";
    WordCategory["DEMONSTRATIVE"] = "DEMO";
    WordCategory["INDEFINITE"] = "INDEF";
    WordCategory["INTERJECTION"] = "INTJ";
    WordCategory["ORDINAL"] = "ORD";
    WordCategory["NOUN"] = "NN";
    WordCategory["PROPER_NOUN"] = "NNP";
    WordCategory["POSSESSIVE"] = "POSS";
    WordCategory["POSTPOSITION"] = "POSTP";
    WordCategory["PRONOUN"] = "PRP";
    WordCategory["PREPOSITION"] = "PREP";
    WordCategory["PREPOSITION_ARTICLE"] = "PREPART";
    WordCategory["PRONOMINAL_ADVERB"] = "PROADV";
    WordCategory["PARTICLE"] = "PRTKL";
    WordCategory["RELATIVE"] = "REL";
    WordCategory["TRUNCATED"] = "TRUNC";
    WordCategory["VERB_PARTICLE"] = "VPART";
    WordCategory["WH_ADVERB"] = "WPADV";
    WordCategory["WH_PRONOUN"] = "WPRO";
    WordCategory["ZU"] = "ZU";
})(WordCategory || (WordCategory = {}));
/**
 * German morphological dictionary that provides word analysis and filtering capabilities
 */
export class GermanMorphDict {
    /**
     * Creates a new German morphological dictionary instance
     * @param dictData - Dictionary data as string or Response object
     * @param progressCallback - Optional callback for loading progress updates
     */
    constructor(dictData, progressCallback) {
        this.dictionary = new Map();
        this.totalEntries = 0;
        this.initialized = (async () => {
            if (dictData instanceof Response) {
                await this.loadDictFromResponse(dictData, progressCallback);
            }
            else {
                this.loadDict(dictData, progressCallback);
            }
        })();
    }
    /**
     * Waits for the dictionary to be fully loaded
     * @returns Promise that resolves when dictionary is ready
     */
    async waitForReady() {
        await this.initialized;
    }
    /**
     * Loads dictionary data from a Response object (e.g., fetch response)
     * @param response - Response object containing dictionary data
     * @param progressCallback - Optional callback for loading progress updates
     * @throws Error if response body is null or data is invalid
     */
    async loadDictFromResponse(response, progressCallback) {
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
                const { done, value } = await reader.read();
                if (done) {
                    this.processChunk(buffer, true);
                    break;
                }
                loadedBytes += value.length;
                buffer += decoder.decode(value, { stream: true });
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
        }
        catch (error) {
            throw new Error(`Failed to load dictionary: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Loads dictionary data from a string
     * @param dictData - String containing dictionary data
     * @param progressCallback - Optional callback for loading progress updates
     */
    loadDict(dictData, progressCallback) {
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
    processChunk(chunk, isLastChunk) {
        const lines = chunk.split('\n');
        let currentWord = null;
        let currentAnalyses = [];
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine)
                continue;
            if (!trimmedLine.includes(",")) {
                this.addCurrentWordToDictionary(currentWord, currentAnalyses);
                currentWord = trimmedLine;
                currentAnalyses = [];
            }
            else {
                const parts = trimmedLine.split(" ");
                if (parts.length < 2)
                    continue;
                const lemma = parts[0];
                if (!lemma)
                    continue;
                const analysis = parts[1];
                if (!analysis)
                    continue;
                const analysisParts = analysis.split(",");
                if (!analysisParts.length)
                    continue;
                const category = analysisParts[0];
                if (!Object.values(WordCategory).includes(category))
                    continue;
                currentAnalyses.push({
                    lemma,
                    category: category,
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
    addCurrentWordToDictionary(currentWord, currentAnalyses) {
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
    *filterWordsGenerator(regex, categories) {
        for (const [word, entries] of this.dictionary) {
            if (regex && !regex.test(word))
                continue;
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
    async filterWords(regex, categories, progressCallback) {
        await this.initialized;
        const result = [];
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
    async combineFilters(regex, categories, progressCallback) {
        return this.filterWords(regex, categories, progressCallback);
    }
    /**
     * Gets all entries in the dictionary
     * @returns Promise resolving to array of all word entries
     */
    async getDictionary() {
        await this.initialized;
        const result = [];
        for (const entries of this.dictionary.values()) {
            result.push(...entries);
        }
        return result;
    }
}
//# sourceMappingURL=GermanMorphDict.js.map