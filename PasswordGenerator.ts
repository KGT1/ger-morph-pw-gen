import { GermanMorphDict, WordCategory, WordEntry } from './GermanMorphDict';

export enum PasswordMode {
    SIMPLE = "simple",
    STRONG = "strong"
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
