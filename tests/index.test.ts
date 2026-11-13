import * as lib from '../index';
import { GermanMorphDict } from '../GermanMorphDict';
import { PasswordGenerator } from '../PasswordGenerator';
import { SentenceGenerator } from '../SentenceGenerator';
import { Wordlist } from '../Wordlist';
import { fixtureWordlist } from './fixtures/wordlist';

describe('index', () => {
    it('should re-export the public API of every module', () => {
        expect(lib.SentenceGenerator).toBe(SentenceGenerator);
        expect(lib.Wordlist).toBe(Wordlist);
        expect(lib.GermanMorphDict).toBe(GermanMorphDict);
        expect(lib.PasswordGenerator).toBe(PasswordGenerator);
        for (const name of [
            'crackTimeEstimates', 'ATTACKER_MODELS', 'DEFAULT_SENTENCE_OPTIONS', 'SEPARATORS',
            'TRAILING_SYMBOLS', 'MAX_DIGITS', 'loadWordlist', 'WordlistError', 'declineAdjective',
            'declineNoun', 'isLayoutSafe', 'isLayoutSafeWord', 'findLayoutUnsafeChars',
            'LAYOUT_SAFE_CHARS', 'randomInt', 'randomChoice', 'cryptoRandomSource',
            'WordCategory', 'PasswordMode'
        ]) {
            expect(lib).toHaveProperty(name);
        }
    });

    it('should generate a passphrase through the entry point', () => {
        const { password, entropyBits } = new lib.SentenceGenerator(lib.loadWordlist(fixtureWordlist)).generate();
        expect(lib.isLayoutSafe(password)).toBe(true);
        expect(lib.crackTimeEstimates(entropyBits).length).toBe(lib.ATTACKER_MODELS.length);
    });
});
