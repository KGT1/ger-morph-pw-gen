import {
    findLayoutUnsafeChars,
    isLayoutSafe,
    isLayoutSafeWord,
    LAYOUT_SAFE_CHARS
} from '../LayoutSafety';

describe('LayoutSafety', () => {
    it('should allow exactly a-x, A-X, digits, ! $ % . , and space', () => {
        expect([...LAYOUT_SAFE_CHARS].sort().join('')).toBe(
            ' !$%,.0123456789ABCDEFGHIJKLMNOPQRSTUVWXabcdefghijklmnopqrstuvwx'
        );
    });

    it('should accept layout-safe text', () => {
        expect(isLayoutSafe('flinkerFuchs.malt.leise.roteTomate.42!')).toBe(true);
        expect(isLayoutSafe('a, b $5 %')).toBe(true);
        expect(isLayoutSafe('')).toBe(true);
    });

    it.each(['y', 'Z', 'ä', 'Ö', 'ß', 'ẞ', '-', '+', '#', '/', '@', '?', '&', '*', ':', ';', '_', 'é', '\t'])(
        'should reject %p',
        (char) => {
            expect(isLayoutSafe(`ab${char}`)).toBe(false);
            expect(findLayoutUnsafeChars(`ab${char}`)).toEqual([char]);
        }
    );

    it('should list each offending character once in order of occurrence', () => {
        expect(findLayoutUnsafeChars('Zyklus-Zähler')).toEqual(['Z', 'y', '-', 'ä']);
    });

    it('should accept only non-empty words of layout-safe letters', () => {
        expect(isLayoutSafeWord('Tomate')).toBe(true);
        expect(isLayoutSafeWord('')).toBe(false);
        expect(isLayoutSafeWord('rote Tomate')).toBe(false);
        expect(isLayoutSafeWord('Tomate42')).toBe(false);
        expect(isLayoutSafeWord('Zebra')).toBe(false);
    });
});
