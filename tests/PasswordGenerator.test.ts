import { GermanMorphDict } from '../GermanMorphDict';
import { PasswordGenerator, PasswordMode } from '../PasswordGenerator';
import { RandomSource } from '../Random';
import { sequenceRng } from './sequenceRng';

// Test dictionary with words for all genders and special characters
const testData = `
Suppe
Suppe NN,fem,nom,sing

Säge
Säge NN,fem,nom,sing

Tacker
Tacker NN,masc,nom,sing

Tafel
Tafel NN,fem,nom,sing

Tanne
Tanne NN,fem,nom,sing

Tasche
Tasche NN,fem,nom,sing

Tasse
Tasse NN,fem,nom,sing

Teddy
Teddy NN,masc,nom,sing

Teller
Teller NN,masc,nom,sing

Ticket
Ticket NN,neut,nom,sing

Tiger
Tiger NN,masc,nom,sing,strong
Tiger NN,masc,nom,sing

Tisch
Tisch NN,masc,nom,sing

Tomate
Tomate NN,fem,nom,sing

Topf
Topf NN,masc,nom,sing

Torte
Torte NN,fem,nom,sing

Treppe
Treppe NN,fem,nom,sing

Trikot
Trikot NN,masc,nom,sing
Trikot NN,neut,nom,sing

Tuch
Tuch NN,neut,nom,sing

Turm
Turm NN,masc,nom,sing

Vase
Vase NN,fem,nom,sing

Vogel
Vogel NN,masc,nom,sing

Waage
Waage NN,fem,nom,sing

Waffel
Waffel NN,fem,nom,sing

Wagen
Wagen NN,neut,nom,sing
Wagen NN,masc,nom,sing

Waggon
Waggon NN,masc,nom,sing
Waggon NN,neut,nom,sing

Wasser
Wasser NN,neut,nom,sing

Wecker
Wecker NN,masc,nom,sing

Wetter
Wetter NN,neut,nom,sing
Wetter NN,masc,nom,sing

Wiese
Wiese NN,fem,nom,sing

Wind
Wind NN,masc,nom,sing

Wolke
Wolke NN,fem,nom,sing

Wurm
Wurm NN,masc,nom,sing

Wurst
Wurst NN,fem,nom,sing

Würfel
Würfel NN,masc,nom,sing

Zahn
Zahn NN,masc,nom,sing

Zange
Zange NN,fem,nom,sing

Zaun
Zaun NN,masc,nom,sing

Zebra
Zebra NN,neut,nom,sing

Zelt
Zelt NN,neut,nom,sing
Zelt NN,masc,nom,sing

Zimmer
Zimmer NN,neut,nom,sing

Zucker
Zucker NN,masc,nom,sing

Zweig
Zweig NN,masc,nom,sing

aktiver
aktiv ADJ,masc,nom,sing,pos,strong

aktiverer
aktiv ADJ,masc,nom,sing,comp,strong

aktiveres
aktiv ADJ,neut,nom,sing,comp,strong

aktives
aktiv ADJ,neut,nom,sing,pos,strong

aktivster
aktiv ADJ,masc,nom,sing,sup,strong

aktivstes
aktiv ADJ,neut,nom,sing,sup,strong

bekannter
bekannt ADJ,masc,nom,sing,pos,strong

bekannterer
bekannt ADJ,masc,nom,sing,comp,strong

bekannteres
bekannt ADJ,neut,nom,sing,comp,strong

bekanntes
bekannt ADJ,neut,nom,sing,pos,strong

bekanntester
bekannt ADJ,masc,nom,sing,sup,strong

bekanntestes
bekannt ADJ,neut,nom,sing,sup,strong

beliebter
beliebt ADJ,masc,nom,sing,pos,strong

beliebterer
beliebt ADJ,masc,nom,sing,comp,strong

beliebteres
beliebt ADJ,neut,nom,sing,comp,strong

beliebtes
beliebt ADJ,neut,nom,sing,pos,strong

beliebtester
beliebt ADJ,masc,nom,sing,sup,strong

beliebtestes
beliebt ADJ,neut,nom,sing,sup,strong

bereiter
bereit ADJ,masc,nom,sing,pos,strong

bereites
bereit ADJ,neut,nom,sing,pos,strong

berühmter
berühmt ADJ,masc,nom,sing,pos,strong

berühmterer
berühmt ADJ,masc,nom,sing,comp,strong

berühmteres
berühmt ADJ,neut,nom,sing,comp,strong

berühmtes
berühmt ADJ,neut,nom,sing,pos,strong

berühmtester
berühmt ADJ,masc,nom,sing,sup,strong

berühmtestes
berühmt ADJ,neut,nom,sing,sup,strong

billiger
billig ADJ,masc,nom,sing,pos,strong

billigerer
billig ADJ,masc,nom,sing,comp,strong

billigeres
billig ADJ,neut,nom,sing,comp,strong

billiges
billig ADJ,neut,nom,sing,pos,strong

billigster
billig ADJ,masc,nom,sing,sup,strong

billigstes
billig ADJ,neut,nom,sing,sup,strong

bitterer
bitter ADJ,masc,nom,sing,pos,strong

bittererer
bitter ADJ,masc,nom,sing,comp,strong

bittereres
bitter ADJ,neut,nom,sing,comp,strong

bitteres
bitter ADJ,neut,nom,sing,pos,strong

bitterster
bitter ADJ,masc,nom,sing,sup,strong

bitterstes
bitter ADJ,neut,nom,sing,sup,strong

brauner
braun ADJ,masc,nom,sing,pos,strong

braunerer
braun ADJ,masc,nom,sing,comp,strong

brauneres
braun ADJ,neut,nom,sing,comp,strong

braunes
braun ADJ,neut,nom,sing,pos,strong

braunster
braun ADJ,masc,nom,sing,sup,strong

braunstes
braun ADJ,neut,nom,sing,sup,strong

breiter
breit ADJ,masc,nom,sing,pos,strong

breiterer
breit ADJ,masc,nom,sing,comp,strong

breiteres
breit ADJ,neut,nom,sing,comp,strong

breites
breit ADJ,neut,nom,sing,pos,strong

breitester
breit ADJ,masc,nom,sing,sup,strong

breitestes
breit ADJ,neut,nom,sing,sup,strong

dankbarer
dankbar ADJ,masc,nom,sing,pos,strong

dankbarerer
dankbar ADJ,masc,nom,sing,comp,strong

starke
stark ADJ,fem,nom,sing,pos,strong

stille
still ADJ,fem,nom,sing,pos,strong

sichere
sicher ADJ,fem,nom,sing,pos,strong

intensive
intensiv ADJ,fem,nom,sing,pos,strong
`;

/** Random source returning 0, 1, 2, ... (wrapping at 2^32) */
const counterRng = (): RandomSource => {
    let next = 0;
    return (array: Uint32Array): Uint32Array => {
        for (let i = 0; i < array.length; i++) {
            array[i] = next;
            next = (next + 1) % 2 ** 32;
        }
        return array;
    };
};

// Distinct adjective-noun pairs in testData:
// masc 10 adjectives x 21 nouns (Tiger listed twice), fem 4 x 16, neut 9 x 10
const SIMPLE_PAIRS = 10 * 21 + 4 * 16 + 9 * 10;
// Strong mode (layout-safe and containing S/s/I/i):
// masc 6 x 4 (Tiger, Tisch, Trikot, Wind), fem 4 x 6, neut 8 x 3
const STRONG_PAIRS = 6 * 4 + 4 * 6 + 8 * 3;

describe('PasswordGenerator', () => {
    let dict: GermanMorphDict;
    let generator: PasswordGenerator;

    beforeEach(async () => {
        dict = new GermanMorphDict(testData);
        await dict.waitForReady();
        generator = new PasswordGenerator(dict);
    });

    describe('Simple Mode', () => {
        it('should generate a password in simple mode', async () => {
            const password = await generator.generatePassword(PasswordMode.SIMPLE);
            expect(password).toBeTruthy();
            // Should be two words concatenated (adjective + noun)
            expect(password).toMatch(/^[a-zäöüß]+[A-ZÄÖÜ][a-zäöüß]+$/);
        });

        it('should generate multiple unique passwords', async () => {
            const passwords = await generator.generatePasswords(PasswordMode.SIMPLE, 5);
            expect(passwords.length).toBe(5);
            // Check uniqueness
            const uniquePasswords = new Set(passwords);
            expect(uniquePasswords.size).toBe(5);
        });

        it('should allow words with special characters in simple mode', async () => {
            // Deterministic: the counter RNG walks through every adjective-noun pair
            const deterministic = new PasswordGenerator(dict, counterRng());
            const passwords: string[] = [];
            for (let i = 0; i < SIMPLE_PAIRS; i++) {
                passwords.push(await deterministic.generatePassword(PasswordMode.SIMPLE));
            }
            // In simple mode, words with Ä,Ö,Ü,ẞ should be allowed
            expect(passwords).toContain('berühmterWürfel');
            expect(passwords).toContain('starkeSäge');
            expect(passwords.some(pw => /[ÄÖÜäöüß]/.test(pw))).toBe(true);
        });

        it('should map every random value to a distinct adjective-noun pair', async () => {
            const deterministic = new PasswordGenerator(dict, counterRng());
            const passwords: string[] = [];
            for (let i = 0; i < SIMPLE_PAIRS + 1; i++) {
                passwords.push(await deterministic.generatePassword(PasswordMode.SIMPLE));
            }
            // Each of the SIMPLE_PAIRS draws hits a different pair, so selection is
            // uniform over pairs (not over genders); the next draw wraps around
            expect(new Set(passwords.slice(0, SIMPLE_PAIRS)).size).toBe(SIMPLE_PAIRS);
            expect(passwords[SIMPLE_PAIRS]).toBe(passwords[0]);
            // Tiger has two dictionary analyses but is only one pair per adjective
            expect(passwords.filter(pw => pw === 'aktiverTiger').length).toBe(1);
        });

        it('should keep gender agreement', async () => {
            const deterministic = new PasswordGenerator(dict, counterRng());
            const passwords = new Set<string>();
            for (let i = 0; i < SIMPLE_PAIRS; i++) {
                passwords.add(await deterministic.generatePassword(PasswordMode.SIMPLE));
            }
            expect(passwords.has('aktiverTisch')).toBe(true);
            expect(passwords.has('aktivesTisch')).toBe(false);
            expect(passwords.has('aktivesZimmer')).toBe(true);
            expect(passwords.has('starkeTasse')).toBe(true);
            // Wetter is masc and neut in the dictionary
            expect(passwords.has('aktiverWetter')).toBe(true);
            expect(passwords.has('aktivesWetter')).toBe(true);
        });
    });

    describe('Strong Mode', () => {
        it('should generate a password in strong mode', async () => {
            const password = await generator.generatePassword(PasswordMode.STRONG);
            expect(password).toBeTruthy();
            // Should contain a special character
            expect(password).toMatch(/[$!]/);
            // Should end with two digits
            expect(password).toMatch(/\d{2}$/);
            // Should only contain layout-safe characters
            expect(password).toMatch(/^[a-xA-X$!]+\d{2}$/);
        });

        it('should generate multiple unique strong passwords', async () => {
            const passwords = await generator.generatePasswords(PasswordMode.STRONG, 5);
            expect(passwords.length).toBe(5);
            // Check uniqueness
            const uniquePasswords = new Set(passwords);
            expect(uniquePasswords.size).toBe(5);
            // All passwords should follow strong mode rules
            passwords.forEach(password => {
                expect(password).toMatch(/[$!]/);
                expect(password).toMatch(/\d{2}$/);
                expect(password).not.toMatch(/[ÄÖÜẞyz+]/);
            });
        });

        it('should replace S,s,I,i with special characters', async () => {
            const password = await generator.generatePassword(PasswordMode.STRONG);
            // Extract the part before the digits
            const base = password.slice(0, -2);
            // Should have exactly one special character, never '+'
            expect(base.match(/[$!]/g)?.length).toBe(1);
            expect(base).not.toContain('+');
            const specialCharIndex = base.search(/[$!]/);
            const replaced = base.charAt(specialCharIndex) === '$' ? ['S', 's'] : ['I', 'i'];
            // Putting a matching letter back must give the original words
            const candidates = replaced.map(letter =>
                base.slice(0, specialCharIndex) + letter + base.slice(specialCharIndex + 1));
            expect(candidates.some(c => /^[a-x]+[A-X][a-x]+$/.test(c))).toBe(true);
        });

        it('should replace the character at the chosen position', async () => {
            // Draws: pair 0 = aktiver + Tiger, eligible positions [3, 8] -> pick 1, digits 4 and 2
            const seq = sequenceRng(0, 1, 4, 2);
            const deterministic = new PasswordGenerator(dict, seq.rng);
            expect(await deterministic.generatePassword(PasswordMode.STRONG)).toBe('aktiverT!ger42');
            expect(seq.used()).toBe(4);

            const first = new PasswordGenerator(dict, sequenceRng(0, 0, 0, 7).rng);
            expect(await first.generatePassword(PasswordMode.STRONG)).toBe('akt!verTiger07');
        });

        it('should filter out words with Ä,Ö,Ü,ẞ,y,z', async () => {
            const bases: string[] = [];
            for (let pick = 0; pick <= STRONG_PAIRS; pick++) {
                // Draws: pair index, substitution position, two digits
                const deterministic = new PasswordGenerator(dict, sequenceRng(pick, 0, 0, 0).rng);
                const password = await deterministic.generatePassword(PasswordMode.STRONG);
                expect(password).not.toMatch(/[ÄÖÜẞäöüßYyZz+]/);
                expect(password).toMatch(/^[a-xA-X]*[$!][a-xA-X]*00$/);
                bases.push(password.slice(0, -2));
            }
            // Every pick below STRONG_PAIRS is a distinct strong-mode pair; the next wraps
            expect(new Set(bases.slice(0, STRONG_PAIRS)).size).toBe(STRONG_PAIRS);
            expect(bases[STRONG_PAIRS]).toBe(bases[0]);
        });

        it('should only use words containing S, s, I or i (T no longer qualifies)', async () => {
            const tDict = new GermanMorphDict([
                'Topf', 'Topf NN,masc,nom,sing', '',
                'Tisch', 'Tisch NN,masc,nom,sing', '',
                'Café', 'Café NN,neut,nom,sing', '',
                'Schi-Lift', 'Schi-Lift NN,masc,nom,sing', '',
                'roter', 'rot ADJ,masc,nom,sing,pos,strong', '',
                'lieber', 'lieb ADJ,masc,nom,sing,pos,strong', '',
                'feines', 'fein ADJ,neut,nom,sing,pos,strong'
            ].join('\n'));
            const deterministic = new PasswordGenerator(tDict, counterRng());
            const passwords = new Set<string>();
            for (let i = 0; i < 20; i++) {
                passwords.add((await deterministic.generatePassword(PasswordMode.STRONG)).slice(0, -2));
            }
            expect([...passwords].sort()).toEqual(['l!eberTisch', 'lieberT!sch', 'lieberTi$ch'].sort());
            await expect(deterministic.generatePassword(PasswordMode.SIMPLE)).resolves.toMatch(/^(roter|lieber)/);
        });
    });

    describe('Internals', () => {
        it('should scan the dictionary only once per instance', async () => {
            const spy = jest.spyOn(dict, 'filterWords');
            for (let i = 0; i < 5; i++) {
                await generator.generatePassword(PasswordMode.SIMPLE);
                await generator.generatePassword(PasswordMode.STRONG);
            }
            // One call for nouns, one for adjectives
            expect(spy).toHaveBeenCalledTimes(2);
        });

        it('should use Web Crypto by default', async () => {
            const spy = jest.spyOn(globalThis.crypto, 'getRandomValues');
            await generator.generatePassword(PasswordMode.STRONG);
            expect(spy).toHaveBeenCalled();
        });

        it('should throw if there are no valid pairs', async () => {
            const nounsOnly = new GermanMorphDict('Tisch\nTisch NN,masc,nom,sing');
            const gen = new PasswordGenerator(nounsOnly);
            await expect(gen.generatePassword(PasswordMode.SIMPLE))
                .rejects.toThrow('No valid adjective-noun pairs found in simple mode');

            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
            await expect(gen.generatePasswords(PasswordMode.SIMPLE, 2))
                .rejects.toThrow('Failed to generate any valid passwords');
            expect(errorSpy).toHaveBeenCalledWith(
                'Error generating password:', 'No valid adjective-noun pairs found in simple mode');
        });

        it('should report non-Error failures while generating multiple passwords', async () => {
            const gen = new PasswordGenerator(dict);
            jest.spyOn(gen, 'generatePassword').mockRejectedValue('boom');
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
            await expect(gen.generatePasswords(PasswordMode.SIMPLE, 1))
                .rejects.toThrow('Failed to generate any valid passwords');
            expect(errorSpy).toHaveBeenCalledWith('Error generating password:', 'Unknown error');
        });

        it('should reject a password count below 1', async () => {
            await expect(generator.generatePasswords(PasswordMode.SIMPLE, 0))
                .rejects.toThrow('Password count must be greater than 0');
        });

        it('should not cache a failed dictionary load', async () => {
            const broken = new GermanMorphDict(new Response(null));
            await expect(broken.waitForReady()).rejects.toThrow();
            const gen = new PasswordGenerator(broken);
            await expect(gen.generatePassword(PasswordMode.SIMPLE)).rejects.toThrow('Response body is null');
            await expect(gen.generatePassword(PasswordMode.SIMPLE)).rejects.toThrow('Response body is null');
        });
    });
});
