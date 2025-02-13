import { WordCategory } from './GermanMorphDict';
/**
 * Password generation modes that determine the complexity and format of generated passwords
 */
export var PasswordMode;
(function (PasswordMode) {
    /** Simple mode generates passwords without special characters or numbers */
    PasswordMode["SIMPLE"] = "simple";
    /** Strong mode includes special character substitutions and numbers */
    PasswordMode["STRONG"] = "strong";
})(PasswordMode || (PasswordMode = {}));
/**
 * Configuration for special character substitutions in strong password mode
 */
const SPECIAL_CHAR_MAP = {
    'S': '$', 's': '$',
    'I': '!', 'i': '!',
    'T': '+', 't': '+'
};
/**
 * Characters that should be filtered out from strong passwords
 */
const STRONG_MODE_FILTERED_CHARS = new Set([
    'Ä', 'ä', 'Ö', 'ö', 'Ü', 'ü', 'ẞ', 'ß', 'Y', 'y', 'Z', 'z'
]);
/**
 * Generates secure passwords using German morphological word combinations
 */
export class PasswordGenerator {
    /**
     * Creates a new password generator instance
     * @param dict - German morphological dictionary instance
     */
    constructor(dict) {
        this.dict = dict;
    }
    /**
     * Gets a random item from an array
     * @param arr - Array to select from
     * @returns Random item from the array
     * @throws Error if array is empty
     */
    getRandomItem(arr) {
        if (!arr.length) {
            throw new Error('Cannot get random item from empty array');
        }
        const index = Math.floor(Math.random() * arr.length);
        // This assertion is safe because we checked arr.length > 0
        return arr[index];
    }
    /**
     * Generates a string of random digits
     * @param length - Number of digits to generate
     * @returns String of random digits
     */
    getRandomDigits(length) {
        return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
    }
    /**
     * Retrieves and filters words from the dictionary based on grammatical criteria
     * @returns Promise resolving to filtered adjectives and nouns grouped by gender
     */
    async getFilteredWords() {
        // Get nouns (nominative singular)
        const nouns = await this.dict.filterWords(undefined, [WordCategory.NOUN]);
        const nomSingNouns = nouns.filter(entry => entry.analysis.attributes.includes('nom') &&
            entry.analysis.attributes.includes('sing'));
        // Get adjectives (nominative, singular, positive)
        const adjectives = await this.dict.filterWords(undefined, [WordCategory.ADJECTIVE]);
        const baseFilteredAdj = adjectives.filter(entry => entry.analysis.attributes.includes('pos') &&
            entry.analysis.attributes.includes('nom') &&
            entry.analysis.attributes.includes('sing'));
        // Group nouns by gender
        const nounsByGender = {
            masc: nomSingNouns.filter(n => n.analysis.attributes.includes('masc')),
            fem: nomSingNouns.filter(n => n.analysis.attributes.includes('fem')),
            neut: nomSingNouns.filter(n => n.analysis.attributes.includes('neut'))
        };
        // For adjectives, require strong declension for masculine and neuter
        const adjByGender = {
            masc: baseFilteredAdj.filter(a => a.analysis.attributes.includes('masc') &&
                a.analysis.attributes.includes('strong')),
            fem: baseFilteredAdj.filter(a => a.analysis.attributes.includes('fem')),
            neut: baseFilteredAdj.filter(a => a.analysis.attributes.includes('neut') &&
                a.analysis.attributes.includes('strong'))
        };
        return { adjByGender, nounsByGender };
    }
    /**
     * Filters words to ensure they meet strong password criteria
     * @param words - Array of word entries to filter
     * @returns Filtered array of word entries suitable for strong passwords
     */
    filterStrongWords(words) {
        return words.filter(entry => {
            const word = entry.word;
            // Filter out words with special characters in strong mode
            if ([...STRONG_MODE_FILTERED_CHARS].some(char => word.includes(char))) {
                return false;
            }
            // Must contain at least one character that can be replaced with a special character
            return Object.keys(SPECIAL_CHAR_MAP).some(char => word.includes(char));
        });
    }
    /**
     * Gets filtered words based on the password mode
     * @param words - Array of word entries to filter
     * @param mode - Password generation mode
     * @returns Filtered array of word entries
     */
    getWordsByMode(words, mode) {
        if (mode === PasswordMode.STRONG) {
            return this.filterStrongWords(words);
        }
        return [...words];
    }
    /**
     * Replaces a random eligible character with its special character equivalent
     * @param word - Word to process
     * @returns Word with one special character substitution
     */
    replaceSpecialChar(word) {
        const eligibleChars = word.match(/[SsIiTt]/g);
        if (!eligibleChars)
            return word;
        const charToReplace = this.getRandomItem(eligibleChars);
        const replacement = SPECIAL_CHAR_MAP[charToReplace];
        if (!replacement)
            return word;
        return word.replace(charToReplace, replacement);
    }
    /**
     * Generates a single password
     * @param mode - Password generation mode
     * @returns Promise resolving to generated password
     * @throws Error if no valid words are found or if word filtering fails
     */
    async generatePassword(mode) {
        const { adjByGender, nounsByGender } = await this.getFilteredWords();
        const gender = this.getRandomItem(['masc', 'fem', 'neut']);
        let adjectives = adjByGender[gender];
        let nouns = nounsByGender[gender];
        if (!adjectives?.length || !nouns?.length) {
            throw new Error(`No valid words found for gender: ${gender}`);
        }
        adjectives = this.getWordsByMode(adjectives, mode);
        nouns = this.getWordsByMode(nouns, mode);
        if (!adjectives.length || !nouns.length) {
            throw new Error(`No valid words found for gender: ${gender} in ${mode} mode`);
        }
        const adj = this.getRandomItem(adjectives);
        const noun = this.getRandomItem(nouns);
        let password = adj.word + noun.word;
        if (mode === PasswordMode.STRONG) {
            password = this.replaceSpecialChar(password);
            password += this.getRandomDigits(2);
        }
        return password;
    }
    /**
     * Generates multiple unique passwords
     * @param mode - Password generation mode
     * @param count - Number of passwords to generate (default: 10)
     * @returns Promise resolving to array of unique passwords
     */
    async generatePasswords(mode, count = 10) {
        if (count < 1) {
            throw new Error('Password count must be greater than 0');
        }
        const passwords = [];
        const usedCombos = new Set();
        const maxAttempts = count * 3;
        for (let attempts = 0; attempts < maxAttempts && passwords.length < count; attempts++) {
            try {
                const password = await this.generatePassword(mode);
                if (!usedCombos.has(password)) {
                    usedCombos.add(password);
                    passwords.push(password);
                }
            }
            catch (error) {
                console.error('Error generating password:', error instanceof Error ? error.message : 'Unknown error');
            }
        }
        if (!passwords.length) {
            throw new Error('Failed to generate any valid passwords');
        }
        return passwords;
    }
}
//# sourceMappingURL=PasswordGenerator.js.map