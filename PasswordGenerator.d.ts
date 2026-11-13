import { GermanMorphDict } from './GermanMorphDict';
import { RandomSource } from './Random';
/**
 * Password generation modes that determine the complexity and format of generated passwords
 */
export declare enum PasswordMode {
    /** Simple mode generates passwords without special characters or numbers */
    SIMPLE = "simple",
    /**
     * Strong mode includes a special character substitution and two digits.
     * Only words made of layout-safe letters (a-x, A-X) that contain an
     * S, s, I or i are used.
     */
    STRONG = "strong"
}
/**
 * Generates passwords using German adjective-noun combinations from a
 * morphological dictionary (e.g. `aktiverTisch`, `starke$Tasse42`).
 *
 * @remarks
 * Legacy API, kept for backwards compatibility. New code should use
 * {@link SentenceGenerator}, which produces longer, keyboard-layout-safe
 * passphrases with a documented strength estimate. Note that
 * {@link PasswordMode.SIMPLE} passwords may contain umlauts and `ß`, which
 * cannot be typed on non-German keyboards.
 *
 * All randomness comes from `globalThis.crypto.getRandomValues` (or the
 * injected random source). The adjective-noun pair is chosen uniformly among
 * all distinct pairs of the selected mode.
 */
export declare class PasswordGenerator {
    private readonly dict;
    private readonly rng;
    private pools;
    /**
     * Creates a new password generator instance
     * @param dict - German morphological dictionary instance
     * @param rng - Random source (default: Web Crypto); inject only for tests
     */
    constructor(dict: GermanMorphDict, rng?: RandomSource);
    /**
     * Generates a string of random digits
     * @param length - Number of digits to generate
     * @returns String of random digits
     */
    private getRandomDigits;
    /**
     * Returns the word pools per mode and gender, computing them once per
     * instance (the dictionary does not change after loading)
     * @returns Promise resolving to the pools for every mode
     */
    private getPools;
    /**
     * Retrieves and filters words from the dictionary based on grammatical criteria
     * @returns Promise resolving to the deduplicated word pools for every mode
     */
    private computePools;
    /**
     * Replaces the character at a random eligible position with its special
     * character equivalent
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
