/**
 * Keyboard-layout safety helpers.
 *
 * A character is "layout safe" if it is typed with the same key (and the same
 * modifier) on a German QWERTZ and a US QWERTY keyboard. A password made only
 * of such characters can be typed correctly even when the active keyboard
 * layout is not the expected one (e.g. at a boot prompt, in a remote session
 * or on a borrowed computer).
 *
 * Excluded on purpose: `y`/`z` (swapped between QWERTZ and QWERTY), umlauts and
 * `ß` (not on US keyboards), and all symbols that sit on different keys,
 * e.g. `-`, `+`, `#`, `/`, `(`, `)`, `?`, `@`, `&`, `*`, `;`, `:`.
 */

/** Letters that are layout safe: a-x and A-X (no y, z, umlauts or ß) */
export const LAYOUT_SAFE_LETTERS = 'abcdefghijklmnopqrstuvwxABCDEFGHIJKLMNOPQRSTUVWX';

/** Digits are on the same keys on both layouts */
export const LAYOUT_SAFE_DIGITS = '0123456789';

/** Symbols typed identically on German QWERTZ and US QWERTY (including space) */
export const LAYOUT_SAFE_SYMBOLS = '!$%., ';

/** Every layout-safe character */
export const LAYOUT_SAFE_CHARS: ReadonlySet<string> = new Set(
    LAYOUT_SAFE_LETTERS + LAYOUT_SAFE_DIGITS + LAYOUT_SAFE_SYMBOLS
);

/** Matches a non-empty word consisting only of layout-safe letters */
const LAYOUT_SAFE_WORD = /^[a-xA-X]+$/;

/**
 * Checks whether every character of a string is layout safe
 * @param text - String to check
 * @returns True if all characters are in {@link LAYOUT_SAFE_CHARS}
 */
export function isLayoutSafe(text: string): boolean {
    return findLayoutUnsafeChars(text).length === 0;
}

/**
 * Checks whether a string is a non-empty word made only of layout-safe letters
 * @param word - Word to check
 * @returns True if the word matches `/^[a-xA-X]+$/`
 */
export function isLayoutSafeWord(word: string): boolean {
    return LAYOUT_SAFE_WORD.test(word);
}

/**
 * Lists the distinct characters of a string that are not layout safe
 * @param text - String to check
 * @returns Offending characters in order of first occurrence (empty if none)
 */
export function findLayoutUnsafeChars(text: string): string[] {
    const unsafe: string[] = [];
    for (const char of text) {
        if (!LAYOUT_SAFE_CHARS.has(char) && !unsafe.includes(char)) {
            unsafe.push(char);
        }
    }
    return unsafe;
}
