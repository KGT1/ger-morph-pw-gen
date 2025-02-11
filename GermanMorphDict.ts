export enum PasswordMode {
    SIMPLE = "simple",
    STRONG = "strong"
}

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

export class PasswordGenerator {
    private dict: GermanMorphDict;
    private readonly SPECIAL_CHARS = ['$', '!', '+'];
    private readonly FILTERED_CHARS = new Set(['Ä', 'Ö', 'Ü', 'ẞ', 'y', 'z']);

    constructor(dict: GermanMorphDict) {
        this.dict = dict;
    }

    private getRandomItem<T>(arr: T[]): T {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    private getRandomDigits(length: number): string {
        return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
    }

    private async getFilteredWords(): Promise<{
        adjByGender: { [key: string]: WordEntry[] },
        nounsByGender: { [key: string]: WordEntry[] }
    }> {
        // Get nouns (nominative singular)
        const nouns = await this.dict.filterWords(undefined, [WordCategory.NOUN]);
        const nomSingNouns = nouns.filter(entry =>
            entry.analysis.attributes.includes('nom') &&
            entry.analysis.attributes.includes('sing')
        );

        // Get adjectives (strong, nominative, singular, positive)
        const adjectives = await this.dict.filterWords(undefined, [WordCategory.ADJECTIVE]);
        const baseFilteredAdj = adjectives.filter(entry =>
            entry.analysis.attributes.includes('pos') &&
            entry.analysis.attributes.includes('nom') &&
            entry.analysis.attributes.includes('sing') &&
            entry.analysis.attributes.includes('strong')
        );

        // Group by gender
        const nounsByGender = {
            masc: nomSingNouns.filter(n => n.analysis.attributes.includes('masc')),
            fem: nomSingNouns.filter(n => n.analysis.attributes.includes('fem')),
            neut: nomSingNouns.filter(n => n.analysis.attributes.includes('neut'))
        };

        const adjByGender = {
            masc: baseFilteredAdj.filter(a => a.analysis.attributes.includes('masc')),
            fem: baseFilteredAdj.filter(a => a.analysis.attributes.includes('fem')),
            neut: baseFilteredAdj.filter(a => a.analysis.attributes.includes('neut'))
        };

        return { adjByGender, nounsByGender };
    }

    private filterStrongWords(words: WordEntry[]): WordEntry[] {
        return words.filter(entry => {
            const word = entry.word;
            // Filter out words containing filtered characters
            for (const char of this.FILTERED_CHARS) {
                if (word.includes(char)) return false;
            }
            // Must contain at least one of S,s,I,i,T,t
            return /[SsIiTt]/.test(word);
        });
    }

    private replaceSpecialChar(word: string): string {
        const matches = word.match(/[SsIiTt]/g);
        if (!matches) return word;
        
        const charToReplace = this.getRandomItem(matches);
        const specialChar = this.getRandomItem(this.SPECIAL_CHARS);
        return word.replace(charToReplace, specialChar);
    }

    async generatePassword(mode: PasswordMode): Promise<string> {
        const { adjByGender, nounsByGender } = await this.getFilteredWords();
        const gender = this.getRandomItem(['masc', 'fem', 'neut']);
        
        let adjectives = adjByGender[gender];
        let nouns = nounsByGender[gender];

        if (mode === PasswordMode.STRONG) {
            // Filter for words containing special characters and not containing filtered chars
            adjectives = this.filterStrongWords(adjectives);
            nouns = this.filterStrongWords(nouns);
        }

        if (!adjectives?.length || !nouns?.length) {
            throw new Error(`No valid words found for gender: ${gender}`);
        }

        const adj = this.getRandomItem(adjectives);
        const noun = this.getRandomItem(nouns);

        let password = adj.word + noun.word;

        if (mode === PasswordMode.STRONG) {
            // Replace one special character and add random digits
            password = this.replaceSpecialChar(password);
            password += this.getRandomDigits(2);
        }

        return password;
    }

    async generatePasswords(mode: PasswordMode, count: number = 10): Promise<string[]> {
        const passwords: string[] = [];
        const usedCombos = new Set<string>();

        // Try to generate up to count unique passwords
        for (let i = 0; i < count * 3 && passwords.length < count; i++) {
            try {
                const password = await this.generatePassword(mode);
                if (!usedCombos.has(password)) {
                    usedCombos.add(password);
                    passwords.push(password);
                }
            } catch (error) {
                console.error('Error generating password:', error);
            }
        }

        return passwords;
    }
}

export class GermanMorphDict {
    private dictionary: Map<string, WordEntry[]> = new Map();
    private totalEntries: number = 0;

    private initialized: Promise<void>;

    /**
     * Returns a promise that resolves when the dictionary is fully loaded
     */
    public async waitForReady(): Promise<void> {
        await this.initialized;
    }

    constructor(dictData: string | Response, progressCallback?: (progress: LoadProgress) => void) {
        this.initialized = (async () => {
            if (dictData instanceof Response) {
                await this.loadDictFromResponse(dictData, progressCallback);
            } else {
                this.loadDict(dictData, progressCallback);
            }
        })();
    }

    private async loadDictFromResponse(response: Response, progressCallback?: (progress: LoadProgress) => void) {
        if (!response.body) {
            throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let totalBytes = +(response.headers.get('content-length') || 0);
        let loadedBytes = 0;

        while (true) {
            const {done, value} = await reader.read();
            
            if (done) {
                // Process any remaining data in buffer
                this.processChunk(buffer, true);
                break;
            }

            loadedBytes += value.length;
            buffer += decoder.decode(value, {stream: true});

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
                    totalLines: totalBytes,  // Using bytes as proxy for lines
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
    }

    private loadDict(dictData: string, progressCallback?: (progress: LoadProgress) => void) {
        this.processChunk(dictData, true);
        
        if (progressCallback) {
            progressCallback({
                totalLines: dictData.split('\n').length,
                processedLines: dictData.split('\n').length,
                percentage: 100
            });
        }
    }

    private processChunk(chunk: string, isLastChunk: boolean) {
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
                // This is an analysis line
                const parts = trimmedLine.split(" ");
                if (parts.length < 2) continue; // Skip invalid lines

                const analysisParts = parts[1].split(",");
                const category = analysisParts[0] as WordCategory;
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

    private addCurrentWordToDictionary(currentWord: string | null, currentAnalyses: MorphAnalysis[]) {
        if (currentWord && currentAnalyses.length > 0) {
            const entries = currentAnalyses.map(analysis => ({
                word: currentWord!,
                analysis
            }));
            this.dictionary.set(currentWord, entries);
            this.totalEntries += entries.length;
        }
    }

    *filterWordsGenerator(regex?: RegExp, categories?: WordCategory[]): Generator<WordEntry, void, unknown> {
        let processedWords = 0;
        
        for (const [word, entries] of this.dictionary) {
            if (regex && !regex.test(word)) continue;
            
            for (const entry of entries) {
                if (!categories || categories.includes(entry.analysis.category)) {
                    yield entry;
                }
            }
        }
    }

    async filterWords(
        regex?: RegExp, 
        categories?: WordCategory[], 
        progressCallback?: (progress: FilterProgress) => void
    ): Promise<WordEntry[]> {
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

        // Final progress update
        if (progressCallback) {
            progressCallback({
                processedEntries: this.totalEntries,
                totalEntries: this.totalEntries,
                percentage: 100
            });
        }

        return result;
    }

    async combineFilters(
        regex?: RegExp, 
        categories?: WordCategory[],
        progressCallback?: (progress: FilterProgress) => void
    ): Promise<WordEntry[]> {
        return await this.filterWords(regex, categories, progressCallback);
    }

    async getDictionary(): Promise<WordEntry[]> {
        await this.initialized;
        const result: WordEntry[] = [];
        for (const entries of this.dictionary.values()) {
            result.push(...entries); // Include all analyses
        }
        return result;
    }
}
