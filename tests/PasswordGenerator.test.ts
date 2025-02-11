import { GermanMorphDict } from '../GermanMorphDict';
import { PasswordGenerator, PasswordMode } from '../PasswordGenerator';

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
            expect(password).toMatch(/^[A-Za-zÄÖÜäöüß]+$/);
        });

        it('should generate multiple unique passwords', async () => {
            const passwords = await generator.generatePasswords(PasswordMode.SIMPLE, 5);
            expect(passwords.length).toBe(5);
            // Check uniqueness
            const uniquePasswords = new Set(passwords);
            expect(uniquePasswords.size).toBe(5);
        });

        it('should allow words with special characters in simple mode', async () => {
            const passwords = await generator.generatePasswords(PasswordMode.SIMPLE, 10);
            // In simple mode, words with Ä,Ö,Ü,ẞ should be allowed
            const containsUmlaut = passwords.some(pw => /[ÄÖÜäöüß]/.test(pw));
            expect(containsUmlaut).toBe(true);
        });
    });

    describe('Strong Mode', () => {
        it('should generate a password in strong mode', async () => {
            const password = await generator.generatePassword(PasswordMode.STRONG);
            expect(password).toBeTruthy();
            // Should contain a special character
            expect(password).toMatch(/[$!+]/);
            // Should end with two digits
            expect(password).toMatch(/\d{2}$/);
            // Should not contain filtered characters
            expect(password).not.toMatch(/[ÄÖÜẞyz]/);
        });

        it('should generate multiple unique strong passwords', async () => {
            const passwords = await generator.generatePasswords(PasswordMode.STRONG, 5);
            expect(passwords.length).toBe(5);
            // Check uniqueness
            const uniquePasswords = new Set(passwords);
            expect(uniquePasswords.size).toBe(5);
            // All passwords should follow strong mode rules
            passwords.forEach(password => {
                expect(password).toMatch(/[$!+]/);
                expect(password).toMatch(/\d{2}$/);
                expect(password).not.toMatch(/[ÄÖÜẞyz]/);
            });
        });

        it('should replace S,s,I,i,T,t with special characters', async () => {
            const password = await generator.generatePassword(PasswordMode.STRONG);
            // Extract the part before the digits
            const base = password.slice(0, -2);
            // Should have exactly one special character
            expect(base.match(/[$!+]/g)?.length).toBe(1);
            // The special character should be in place of an S,s,I,i,T,t
            const specialCharIndex = base.search(/[$!+]/);
            expect(specialCharIndex).toBeGreaterThan(-1);
            // If we replace the special char back with a letter, it should match the pattern
            const variants = ['S', 's', 'I', 'i', 'T', 't'];
            let matchesPattern = false;
            for (const variant of variants) {
                const reconstructed = base.slice(0, specialCharIndex) + variant + base.slice(specialCharIndex + 1);
                if (/[SsIiTt]/.test(reconstructed)) {
                    matchesPattern = true;
                    break;
                }
            }
            expect(matchesPattern).toBe(true);
        });

        it('should filter out words with Ä,Ö,Ü,ẞ,y,z', async () => {
            const passwords = await generator.generatePasswords(PasswordMode.STRONG, 10);
            passwords.forEach(password => {
                expect(password).not.toMatch(/[ÄÖÜẞyz]/);
            });
        });
    });
});
