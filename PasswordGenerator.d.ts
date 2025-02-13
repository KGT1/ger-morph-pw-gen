import { GermanMorphDict } from './GermanMorphDict';
/**
 * Password generation modes that determine the complexity and format of generated passwords
 */
export declare enum PasswordMode {
    /** Simple mode generates passwords without special characters or numbers */
    SIMPLE = "simple",
    /** Strong mode includes special character substitutions and numbers */
    STRONG = "strong"
}
/**
 * Generates secure passwords using German morphological word combinations
 */
export declare class PasswordGenerator {
    private readonly dict;
    /**
     * Creates a new password generator instance
     * @param dict - German morphological dictionary instance
     */
    constructor(dict: GermanMorphDict);
    /**
     * Gets a random item from an array
     * @param arr - Array to select from
     * @returns Random item from the array
     * @throws Error if array is empty
     */
    private getRandomItem;
    /**
     * Generates a string of random digits
     * @param length - Number of digits to generate
     * @returns String of random digits
     */
    private getRandomDigits;
    /**
     * Retrieves and filters words from the dictionary based on grammatical criteria
     * @returns Promise resolving to filtered adjectives and nouns grouped by gender
     */
    private getFilteredWords;
    /**
     * Filters words to ensure they meet strong password criteria
     * @param words - Array of word entries to filter
     * @returns Filtered array of word entries suitable for strong passwords
     */
    private filterStrongWords;
    /**
     * Replaces a random eligible character with its special character equivalent
     * @param word - Word to process
     * @returns Word with one special character substitution
     */
    private replaceSpecialChar;
    /**
     * Generates a single password
     * @param mode - Password generation mode
     * @returns Promise resolving to generated password
     * @throws Error if no valid words are found or if word filtering fails
     */
    generatePassword(mode: PasswordMode): Promise<string>;
    /**
     * Generates multiple unique passwords
     * @param mode - Password generation mode
     * @param count - Number of passwords to generate (default: 10)
     * @returns Promise resolving to array of unique passwords
     */
    generatePasswords(mode: PasswordMode, count?: number): Promise<string[]>;
}
