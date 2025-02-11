var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
export class GermanMorphDict {
    /**
     * Returns a promise that resolves when the dictionary is fully loaded
     */
    waitForReady() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialized;
        });
    }
    constructor(dictData, progressCallback) {
        this.dictionary = new Map();
        this.totalEntries = 0;
        this.initialized = (() => __awaiter(this, void 0, void 0, function* () {
            if (dictData instanceof Response) {
                yield this.loadDictFromResponse(dictData, progressCallback);
            }
            else {
                this.loadDict(dictData, progressCallback);
            }
        }))();
    }
    loadDictFromResponse(response, progressCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!response.body) {
                throw new Error('Response body is null');
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let totalBytes = +(response.headers.get('content-length') || 0);
            let loadedBytes = 0;
            while (true) {
                const { done, value } = yield reader.read();
                if (done) {
                    // Process any remaining data in buffer
                    this.processChunk(buffer, true);
                    break;
                }
                loadedBytes += value.length;
                buffer += decoder.decode(value, { stream: true });
                // Find last newline character
                const lastNewline = buffer.lastIndexOf('\n');
                if (lastNewline !== -1) {
                    // Process complete lines
                    const completeLines = buffer.slice(0, lastNewline);
                    buffer = buffer.slice(lastNewline + 1);
                    this.processChunk(completeLines, false);
                }
                // Report progress
                if (progressCallback && totalBytes > 0) {
                    progressCallback({
                        totalLines: totalBytes, // Using bytes as proxy for lines
                        processedLines: loadedBytes,
                        percentage: (loadedBytes / totalBytes) * 100
                    });
                }
            }
            // Final progress update
            if (progressCallback) {
                progressCallback({
                    totalLines: totalBytes,
                    processedLines: totalBytes,
                    percentage: 100
                });
            }
        });
    }
    loadDict(dictData, progressCallback) {
        this.processChunk(dictData, true);
        if (progressCallback) {
            progressCallback({
                totalLines: dictData.split('\n').length,
                processedLines: dictData.split('\n').length,
                percentage: 100
            });
        }
    }
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
                // This is an analysis line
                const parts = trimmedLine.split(" ");
                if (parts.length < 2)
                    continue; // Skip invalid lines
                const analysisParts = parts[1].split(",");
                const category = analysisParts[0];
                const attributes = analysisParts.slice(1);
                currentAnalyses.push({
                    lemma: parts[0],
                    category,
                    attributes
                });
            }
        }
        // Add the last word if it exists and this is the last chunk
        if (isLastChunk) {
            this.addCurrentWordToDictionary(currentWord, currentAnalyses);
        }
    }
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
    *filterWordsGenerator(regex, categories) {
        let processedWords = 0;
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
    filterWords(regex, categories, progressCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialized;
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
            // Final progress update
            if (progressCallback) {
                progressCallback({
                    processedEntries: this.totalEntries,
                    totalEntries: this.totalEntries,
                    percentage: 100
                });
            }
            return result;
        });
    }
    combineFilters(regex, categories, progressCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.filterWords(regex, categories, progressCallback);
        });
    }
    getDictionary() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialized;
            const result = [];
            for (const entries of this.dictionary.values()) {
                result.push(...entries); // Include all analyses
            }
            return result;
        });
    }
}
