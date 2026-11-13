import { WordlistData } from '../../Wordlist';

/**
 * Small fixture wordlist: all genders, a weak masculine noun (Hase -> Hasen)
 * and an adjective whose base form differs from its stem (leise).
 */
export const fixtureWordlist: WordlistData = {
    version: 1,
    name: 'fixture',
    nouns: [
        { g: 'm', nom: 'Fuchs', acc: 'Fuchs' },
        { g: 'm', nom: 'Hase', acc: 'Hasen' },
        { g: 'f', nom: 'Tomate', acc: 'Tomate' },
        { g: 'n', nom: 'Pferd', acc: 'Pferd' },
        { g: 'f', nom: 'Maus', acc: 'Maus' }
    ],
    adjectives: [
        { base: 'flink', m: 'flinker', f: 'flinke', n: 'flinkes', accM: 'flinken' },
        { base: 'rot', m: 'roter', f: 'rote', n: 'rotes', accM: 'roten' },
        { base: 'leise', m: 'leiser', f: 'leise', n: 'leises', accM: 'leisen' },
        { base: 'schnell', m: 'schneller', f: 'schnelle', n: 'schnelles', accM: 'schnellen' }
    ],
    verbs: [
        { base: 'malen', s3: 'malt' },
        { base: 'sehen', s3: 'sieht' },
        { base: 'finden', s3: 'findet' }
    ]
};

/** Index of each fixture word, for building deterministic random sequences */
export const NOUN = { Fuchs: 0, Hase: 1, Tomate: 2, Pferd: 3, Maus: 4 } as const;
export const ADJ = { flink: 0, rot: 1, leise: 2, schnell: 3 } as const;
export const VERB = { malt: 0, sieht: 1, findet: 2 } as const;
