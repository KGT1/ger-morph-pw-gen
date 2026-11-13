import {
    AdjEntry,
    declineAdjective,
    declineNoun,
    loadWordlist,
    NounEntry,
    Wordlist,
    WordlistData,
    WordlistError
} from '../Wordlist';
import { fixtureWordlist } from './fixtures/wordlist';

/** Returns the issues of the WordlistError thrown by loading the data */
const issuesOf = (data: unknown): readonly string[] => {
    try {
        loadWordlist(data);
    } catch (error) {
        expect(error).toBeInstanceOf(WordlistError);
        return (error as WordlistError).issues;
    }
    throw new Error('expected loadWordlist to throw');
};

const withChanges = (changes: Partial<Record<keyof WordlistData, unknown>>): unknown =>
    ({ ...fixtureWordlist, ...changes });

describe('Wordlist', () => {
    describe('loading', () => {
        it('should load valid data', () => {
            const wordlist = loadWordlist(fixtureWordlist);
            expect(wordlist).toBeInstanceOf(Wordlist);
            expect(wordlist.name).toBe('fixture');
            expect(wordlist.nouns).toEqual(fixtureWordlist.nouns);
            expect(wordlist.adjectives).toEqual(fixtureWordlist.adjectives);
            expect(wordlist.verbs).toEqual(fixtureWordlist.verbs);
            expect(wordlist.duplicates).toEqual([]);
        });

        it('should default adverbs to the adjective base forms', () => {
            expect(loadWordlist(fixtureWordlist).adverbs).toEqual(['flink', 'rot', 'leise', 'schnell']);
        });

        it('should use explicit adverbs', () => {
            const wordlist = loadWordlist(withChanges({ adverbs: ['gern', 'oft', 'gern'] }));
            expect(wordlist.adverbs).toEqual(['gern', 'oft']);
            expect(wordlist.duplicates).toEqual(['adverbs[2]: word "gern" already used by an earlier entry']);
        });

        it('should be available as Wordlist.load', () => {
            expect(Wordlist.load(fixtureWordlist).nouns.length).toBe(5);
        });
    });

    describe('shape validation', () => {
        it.each([null, 'text', 42, []])('should reject %p as wordlist data', (data) => {
            expect(issuesOf(data)).toEqual(['wordlist data must be an object']);
        });

        it('should reject wrong version and name', () => {
            expect(issuesOf(withChanges({ version: 2, name: ' ' }))).toEqual([
                'version: expected 1, got 2',
                'name: must be a non-empty string'
            ]);
        });

        it('should reject lists that are not arrays', () => {
            expect(issuesOf(withChanges({ nouns: {}, verbs: undefined, adverbs: 'oft' }))).toEqual([
                'nouns: must be an array',
                'verbs: must be an array',
                'adverbs: must be an array of strings if present'
            ]);
        });

        it('should reject malformed entries and list all of them', () => {
            const issues = issuesOf(withChanges({
                nouns: [
                    'Fuchs',
                    { g: 'x', nom: 'Fuchs', acc: 'Fuchs' },
                    { g: 'm', nom: 'Fuchs' },
                    { g: 'f', nom: '', acc: 'Maus' }
                ],
                adjectives: [{ base: 'rot', m: 'roter', f: 'rote', n: 'rotes' }],
                verbs: [{ base: 'malen', s3: 5 }],
                adverbs: [null]
            }));
            expect(issues).toEqual([
                'nouns[0]: must be an object',
                'nouns[1].g: must be "m", "f" or "n", got "x"',
                'nouns[2].acc: must be a non-empty string',
                'nouns[3].nom: must be a non-empty string',
                'adjectives[0].accM: must be a non-empty string',
                'verbs[0].s3: must be a non-empty string',
                'adverbs[0]: must be a non-empty string'
            ]);
        });

        it('should reject empty lists', () => {
            expect(issuesOf(withChanges({ nouns: [], adverbs: [] }))).toEqual([
                'nouns: must contain at least one entry',
                'adverbs: must contain at least one entry'
            ]);
        });

        it('should produce a readable error message', () => {
            expect(() => loadWordlist(withChanges({ version: 0 })))
                .toThrow('Invalid wordlist (1 issue):\n- version: expected 1, got 0');
            expect(() => loadWordlist(withChanges({ version: 0, name: '' })))
                .toThrow(/^Invalid wordlist \(2 issues\):\n- version/);
        });
    });

    describe('layout safety', () => {
        it('should reject and list every word that is not keyboard-layout safe', () => {
            const issues = issuesOf(withChanges({
                nouns: [
                    ...fixtureWordlist.nouns,
                    { g: 'n', nom: 'Zebra', acc: 'Zebra' },
                    { g: 'm', nom: 'Baer', acc: 'Bären' },
                    { g: 'f', nom: 'Straße', acc: 'Straße' }
                ],
                adjectives: [
                    ...fixtureWordlist.adjectives,
                    { base: 'gelb', m: 'gelber', f: 'gelbe', n: 'gelbes', accM: 'gelben' },
                    { base: 'schwer', m: 'schwerer', f: 'schwere', n: 'schweres', accM: 'schweren' },
                    { base: 'ganz', m: 'ganzer', f: 'ganze', n: 'ganzes', accM: 'ganzen' }
                ],
                verbs: [...fixtureWordlist.verbs, { base: 'tanzen', s3: 'tanzt' }],
                adverbs: ['gern', 'okay', 'blau-grün']
            }));
            expect(issues).toEqual([
                'nouns[5].nom "Zebra": not keyboard-layout safe ("Z"); only a-x and A-X are allowed in words',
                'nouns[5].acc "Zebra": not keyboard-layout safe ("Z"); only a-x and A-X are allowed in words',
                'nouns[6].acc "Bären": not keyboard-layout safe ("ä"); only a-x and A-X are allowed in words',
                'nouns[7].nom "Straße": not keyboard-layout safe ("ß"); only a-x and A-X are allowed in words',
                'nouns[7].acc "Straße": not keyboard-layout safe ("ß"); only a-x and A-X are allowed in words',
                'adjectives[6].base "ganz": not keyboard-layout safe ("z"); only a-x and A-X are allowed in words',
                'adjectives[6].m "ganzer": not keyboard-layout safe ("z"); only a-x and A-X are allowed in words',
                'adjectives[6].f "ganze": not keyboard-layout safe ("z"); only a-x and A-X are allowed in words',
                'adjectives[6].n "ganzes": not keyboard-layout safe ("z"); only a-x and A-X are allowed in words',
                'adjectives[6].accM "ganzen": not keyboard-layout safe ("z"); only a-x and A-X are allowed in words',
                'verbs[3].base "tanzen": not keyboard-layout safe ("z"); only a-x and A-X are allowed in words',
                'verbs[3].s3 "tanzt": not keyboard-layout safe ("z"); only a-x and A-X are allowed in words',
                'adverbs[1] "okay": not keyboard-layout safe ("y"); only a-x and A-X are allowed in words',
                'adverbs[2] "blau-grün": not keyboard-layout safe ("-", "ü"); only a-x and A-X are allowed in words'
            ]);
        });

        it('should reject layout-safe characters that are not letters', () => {
            expect(issuesOf(withChanges({ adverbs: ['sehr gut', 'gut!', 'top10'] }))).toEqual([
                'adverbs[0] "sehr gut": words may only contain the letters a-x and A-X',
                'adverbs[1] "gut!": words may only contain the letters a-x and A-X',
                'adverbs[2] "top10": words may only contain the letters a-x and A-X'
            ]);
        });
    });

    describe('casing', () => {
        it('should require nouns to start uppercase and everything else to be lowercase', () => {
            const issues = issuesOf({
                version: 1,
                name: 'casing',
                nouns: [{ g: 'm', nom: 'fuchs', acc: 'Fuchs' }, { g: 'n', nom: 'TV', acc: 'TV' }],
                adjectives: [{ base: 'rot', m: 'Roter', f: 'rote', n: 'rotEs', accM: 'roten' }],
                verbs: [{ base: 'malen', s3: 'Malt' }],
                adverbs: ['Leise']
            });
            expect(issues).toEqual([
                'nouns[0].nom "fuchs": nouns must start with an uppercase letter',
                'adjectives[0].m "Roter": must be all lowercase',
                'adjectives[0].n "rotEs": must be all lowercase',
                'verbs[0].s3 "Malt": must be all lowercase',
                'adverbs[0] "Leise": must be all lowercase'
            ]);
        });
    });

    describe('deduplication', () => {
        it('should keep the first entry for every surface form', () => {
            const wordlist = loadWordlist({
                version: 1,
                name: 'dupes',
                nouns: [
                    { g: 'm', nom: 'Wetter', acc: 'Wetter' },
                    { g: 'n', nom: 'Wetter', acc: 'Wetter' },
                    { g: 'm', nom: 'Bauer', acc: 'Bauern' },
                    // Different nominative, but same accusative as Bauer
                    { g: 'm', nom: 'Bauern', acc: 'Bauern' },
                    { g: 'f', nom: 'Maus', acc: 'Maus' }
                ],
                adjectives: [
                    { base: 'rot', m: 'roter', f: 'rote', n: 'rotes', accM: 'roten' },
                    { base: 'rot', m: 'roter', f: 'rote', n: 'rotes', accM: 'roten' },
                    // Only the feminine form clashes
                    { base: 'roth', m: 'rother', f: 'rote', n: 'rothes', accM: 'rothen' },
                    { base: 'blau', m: 'blauer', f: 'blaue', n: 'blaues', accM: 'blauen' }
                ],
                verbs: [
                    { base: 'malen', s3: 'malt' },
                    { base: 'malten', s3: 'malt' },
                    { base: 'sehen', s3: 'sieht' }
                ]
            });
            expect(wordlist.nouns.map(n => `${n.g}:${n.nom}`)).toEqual(['m:Wetter', 'm:Bauer', 'f:Maus']);
            expect(wordlist.adjectives.map(a => a.base)).toEqual(['rot', 'blau']);
            expect(wordlist.verbs.map(v => v.s3)).toEqual(['malt', 'sieht']);
            expect(wordlist.adverbs).toEqual(['rot', 'blau']);
            expect(wordlist.duplicates).toEqual([
                'nouns[1]: nom "Wetter" already used by an earlier entry',
                'nouns[3]: acc "Bauern" already used by an earlier entry',
                'adjectives[1]: base "rot" already used by an earlier entry',
                'adjectives[2]: f "rote" already used by an earlier entry',
                'verbs[1]: s3 "malt" already used by an earlier entry'
            ]);
        });
    });

    describe('declension helpers', () => {
        const flink: AdjEntry = { base: 'flink', m: 'flinker', f: 'flinke', n: 'flinkes', accM: 'flinken' };
        const hase: NounEntry = { g: 'm', nom: 'Hase', acc: 'Hasen' };

        it('should use strong adjective endings', () => {
            expect(declineAdjective(flink, 'm', 'nom')).toBe('flinker');
            expect(declineAdjective(flink, 'f', 'nom')).toBe('flinke');
            expect(declineAdjective(flink, 'n', 'nom')).toBe('flinkes');
            expect(declineAdjective(flink, 'm', 'acc')).toBe('flinken');
            expect(declineAdjective(flink, 'f', 'acc')).toBe('flinke');
            expect(declineAdjective(flink, 'n', 'acc')).toBe('flinkes');
        });

        it('should use the accusative noun form from the data', () => {
            expect(declineNoun(hase, 'nom')).toBe('Hase');
            expect(declineNoun(hase, 'acc')).toBe('Hasen');
        });
    });
});
