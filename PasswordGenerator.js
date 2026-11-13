import { WordCategory } from './GermanMorphDict';
import { isLayoutSafeWord } from './LayoutSafety';
import { cryptoRandomSource, randomChoice, randomInt } from './Random';
/**
 * Password generation modes that determine the complexity and format of generated passwords
 */
export var PasswordMode;
(function (PasswordMode) {
    /** Simple mode generates passwords without special characters or numbers */
    PasswordMode["SIMPLE"] = "simple";
    /**
     * Strong mode includes a special character substitution and two digits.
     * Only words made of layout-safe letters (a-x, A-X) that contain an
     * S, s, I or i are used.
     */
    PasswordMode["STRONG"] = "strong";
})(PasswordMode || (PasswordMode = {}));
/**
 * Configuration for special character substitutions in strong password mode.
 *
 * Only layout-safe replacements are used (see LayoutSafety); `+` (for
 * T/t) was removed because it sits on different keys on German QWERTZ and US
 * QWERTY keyboards.
 */
const SPECIAL_CHAR_MAP = {
    'S': '$', 's': '$',
    'I': '!', 'i': '!'
};
const GENDERS = ['masc', 'fem', 'neut'];
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
export class PasswordGenerator {
    /**
     * Creates a new password generator instance
     * @param dict - German morphological dictionary instance
     * @param rng - Random source (default: Web Crypto); inject only for tests
     */
    constructor(dict, rng = cryptoRandomSource) {
        this.pools = null;
        this.dict = dict;
        this.rng = rng;
    }
    /**
     * Generates a string of random digits
     * @param length - Number of digits to generate
     * @returns String of random digits
     */
    getRandomDigits(length) {
        return Array.from({ length }, () => randomInt(10, this.rng)).join('');
    }
    /**
     * Returns the word pools per mode and gender, computing them once per
     * instance (the dictionary does not change after loading)
     * @returns Promise resolving to the pools for every mode
     */
    getPools() {
        if (!this.pools) {
            this.pools = this.computePools().catch((error) => {
                // Do not cache failures, e.g. a dictionary that failed to load
                this.pools = null;
                throw error;
            });
        }
        return this.pools;
    }
    /**
     * Retrieves and filters words from the dictionary based on grammatical criteria
     * @returns Promise resolving to the deduplicated word pools for every mode
     */
    async computePools() {
        // Get nouns (nominative singular)
        const nouns = await this.dict.filterWords(undefined, [WordCategory.NOUN]);
        const nomSingNouns = nouns.filter(entry => entry.analysis.attributes.includes('nom') &&
            entry.analysis.attributes.includes('sing'));
        // Get adjectives (nominative, singular, positive)
        const adjectives = await this.dict.filterWords(undefined, [WordCategory.ADJECTIVE]);
        const baseFilteredAdj = adjectives.filter(entry => entry.analysis.attributes.includes('pos') &&
            entry.analysis.attributes.includes('nom') &&
            entry.analysis.attributes.includes('sing'));
        const simple = GENDERS.map(gender => ({
            gender,
            nouns: uniqueWords(nomSingNouns.filter(n => n.analysis.attributes.includes(gender))),
            // Require strong declension for masculine and neuter (-er/-es);
            // feminine strong and weak forms are identical (-e)
            adjectives: uniqueWords(baseFilteredAdj.filter(a => a.analysis.attributes.includes(gender) &&
                (gender === 'fem' || a.analysis.attributes.includes('strong'))))
        }));
        const strong = simple.map(pool => ({
            gender: pool.gender,
            adjectives: pool.adjectives.filter(isStrongModeWord),
            nouns: pool.nouns.filter(isStrongModeWord)
        }));
        return { [PasswordMode.SIMPLE]: simple, [PasswordMode.STRONG]: strong };
    }
    /**
     * Replaces the character at a random eligible position with its special
     * character equivalent
     * @param word - Word to process
     * @returns Word with one special character substitution
     */
    replaceSpecialChar(word) {
        const positions = [];
        for (let i = 0; i < word.length; i++) {
            if (Object.prototype.hasOwnProperty.call(SPECIAL_CHAR_MAP, word.charAt(i))) {
                positions.push(i);
            }
        }
        if (!positions.length)
            return word;
        const position = randomChoice(positions, this.rng);
        const replacement = SPECIAL_CHAR_MAP[word.charAt(position)];
        if (!replacement)
            return word;
        return word.slice(0, position) + replacement + word.slice(position + 1);
    }
    /**
     * Generates a single password
     * @param mode - Password generation mode
     * @returns Promise resolving to generated password
     * @throws Error if no valid words are found or if word filtering fails
     */
    async generatePassword(mode) {
        const pools = (await this.getPools())[mode];
        // Choose a gender weighted by its number of adjective-noun pairs, so
        // every distinct pair is equally likely
        const pairCounts = pools.map(pool => pool.adjectives.length * pool.nouns.length);
        const totalPairs = pairCounts.reduce((sum, count) => sum + count, 0);
        if (totalPairs === 0) {
            throw new Error(`No valid adjective-noun pairs found in ${mode} mode`);
        }
        let pick = randomInt(totalPairs, this.rng);
        let poolIndex = 0;
        while (pick >= pairCounts[poolIndex]) {
            pick -= pairCounts[poolIndex];
            poolIndex++;
        }
        const pool = pools[poolIndex];
        // pick is uniform in [0, adjectives * nouns) of this pool
        const adj = pool.adjectives[Math.floor(pick / pool.nouns.length)];
        const noun = pool.nouns[pick % pool.nouns.length];
        let password = adj + noun;
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
/**
 * Returns the distinct surface forms of the given entries, in order of first
 * occurrence (a word with several analyses would otherwise be over-weighted)
 * @param entries - Word entries
 * @returns Distinct words
 */
function uniqueWords(entries) {
    return [...new Set(entries.map(entry => entry.word))];
}
/**
 * Checks whether a word is eligible for strong mode: only layout-safe letters
 * and at least one character that can be replaced by a special character
 * @param word - Word to check
 * @returns True if the word can be used in strong mode
 */
function isStrongModeWord(word) {
    return isLayoutSafeWord(word) &&
        Object.keys(SPECIAL_CHAR_MAP).some(char => word.includes(char));
}
