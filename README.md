# ger-morph-pw-gen

A TypeScript/JavaScript library that generates memorable German passphrases
which are typed identically on German (QWERTZ) and US (QWERTY) keyboards, and
tells you exactly how strong they are.

```
flinkerFuchs.malt.leise.roteTomate.42!
```

("Nimble fox paints quietly red tomato.") The sentence is grammatical:
adjectives agree in gender and case with their nouns, so it is easy to
remember, while every part is chosen at random with a cryptographically secure
random number generator.

## Installation

The package is installed directly from GitHub (the compiled `.js`/`.d.ts`
files are committed next to the TypeScript sources):

```bash
npm install github:KGT1/ger-morph-pw-gen
```

Requirements: `globalThis.crypto.getRandomValues` (all modern browsers,
Node.js 19+). The compiled files are ES modules with extensionless relative
imports, intended for bundlers (esbuild, Vite, webpack, ...).

## Sentence passphrases

### Format

```
flinkerFuchs . malt . leise . roteTomate . 42 !
└─────┬────┘   └┬─┘   └─┬─┘   └────┬───┘   └┬┘ └ trailing symbol
   subject     verb  adverb     object    digits
```

| Part     | Form                                                                  | Example       |
|----------|-----------------------------------------------------------------------|---------------|
| subject  | adjective, strong nominative, gender of the noun + noun (nominative)  | `flinkerFuchs`, `flinkeMaus`, `flinkesPferd` |
| verb     | 3rd person singular present                                           | `malt`        |
| adverb   | adjective base form (omitted in the short variant)                    | `leise`       |
| object   | adjective, strong accusative, gender of the noun + noun (accusative)  | `roteTomate`, `rotenHasen` |
| digits   | 0-6 random digits (default 2)                                         | `42`          |
| symbol   | `!`, `$`, `%` or none (default `!`)                                   | `!`           |

Strong declension endings: nominative m/f/n `-er`/`-e`/`-es`, accusative
m/f/n `-en`/`-e`/`-es`. Weak masculine nouns use their accusative form from the
wordlist (`Hase` → `rotenHasen`).

### Usage

```typescript
import { SentenceGenerator, loadWordlist, crackTimeEstimates } from 'ger-morph-pw-gen';
// or: import { SentenceGenerator } from 'ger-morph-pw-gen/SentenceGenerator';

const wordlist = loadWordlist(await (await fetch('/wordlist.json')).json());
const generator = new SentenceGenerator(wordlist);

const { password, parts, entropyBits, combinations } = generator.generate();
// password:     'flinkerFuchs.malt.leise.roteTomate.42!'
// parts:        { subjectAdjective: 'flinker', subjectNoun: 'Fuchs', verb: 'malt',
//                 adverb: 'leise', objectAdjective: 'rote', objectNoun: 'Tomate',
//                 digits: '42', trailingSymbol: '!', separator: '.' }
// entropyBits:  log2(combinations)
// combinations: number of equally likely passphrases (bigint)

// Options (all optional; these are the defaults)
generator.generate({
    adverb: true,         // false: short variant without adverb
    separator: '.',       // '.', ',', ' ', '!', '$' or '%'
    digits: 2,            // 0-6
    trailingSymbol: '!'   // '!', '$', '%' or '' (none)
});

generator.generate({ adverb: false, separator: ' ', digits: 3, trailingSymbol: '' });
// 'flinkerFuchs malt roteTomate 042'
```

### Strength

`describeStrength(options)` returns an exact breakdown. Every slot is chosen
uniformly and independently (unbiased rejection sampling on
`crypto.getRandomValues`), so the entropy against an attacker who knows the
wordlist and the options is

```
bits = log2(adjectives) + log2(nouns) + log2(verbs) + log2(adverbs)
     + log2(adjectives) + log2(nouns) + log2(10^digits)
```

Separator and trailing symbol are fixed by the options and add nothing. The
adjective is chosen independently of the noun's gender (the gender only
selects the ending), and the wordlist guarantees that every passphrase decodes
to exactly one choice of words, so `combinations` really is the number of
distinct passphrases.

```typescript
const report = generator.describeStrength();
// report.slots: [
//   { slot: 'subjectAdjective', choices: 300, bits: 8.23 },
//   { slot: 'subjectNoun',      choices: 300, bits: 8.23 },
//   { slot: 'verb',             choices: 200, bits: 7.64 },
//   { slot: 'adverb',           choices: 300, bits: 8.23 },
//   { slot: 'objectAdjective',  choices: 300, bits: 8.23 },
//   { slot: 'objectNoun',       choices: 300, bits: 8.23 },
//   { slot: 'digits',           choices: 100, bits: 6.64 } ]
// report.entropyBits:  55.4   (example numbers for 300 nouns/adjectives, 200 verbs)
// report.combinations: 48600000000000000n
```

`crackTimeEstimates(bits)` converts entropy into the average time to guess
the passphrase (`2^(bits-1) / guesses per second`) for the attacker models in
`ATTACKER_MODELS`:

| Attacker model                             | Guesses per second | 55.4 bits          |
|--------------------------------------------|--------------------|--------------------|
| Online, throttled                          | 100 per hour       | ~28 billion years  |
| Online, unthrottled                        | 10                 | ~77 million years  |
| Offline, bcrypt (cost 10), one RTX 5090    | ~10^4              | ~77,000 years      |
| Offline, MD5/NTLM, one RTX 5090            | ~2·10^11           | ~1.4 days          |
| Offline, fast hash, 1000-GPU cluster       | ~3·10^14           | ~81 seconds        |

The rates are rough orders of magnitude. A passphrase of this size is very
strong against online attacks and slow password hashes, but not against an
offline attack on a fast, unsalted hash. Bigger wordlists, the adverb and more
digits increase the strength: with 6 digits the example above has 68.7 bits
(~40 years on one RTX 5090 against MD5).

### Keyboard-layout safety

Every character of a passphrase is typed with the same key on German QWERTZ
and US QWERTY: the letters `a`-`x`/`A`-`X`, digits, `!`, `$`, `%`, `.`, `,` and
space. Excluded are `y`/`z` (swapped between the layouts), umlauts and `ß`
(missing on US keyboards) and symbols on different keys (`-`, `+`, `#`, `/`,
`@`, ...). Passphrases can therefore be typed even when the active layout is
not the expected one, e.g. at a boot or BIOS prompt, in a remote session or on
someone else's computer.

`isLayoutSafe`, `isLayoutSafeWord` and `findLayoutUnsafeChars` are exported.

### Wordlists

Wordlists are plain data (e.g. JSON):

```typescript
interface WordlistData {
    version: 1;
    name: string;
    nouns: { g: 'm' | 'f' | 'n'; nom: string; acc: string }[];
    adjectives: { base: string; m: string; f: string; n: string; accM: string }[];
    verbs: { base: string; s3: string }[];
    adverbs?: string[];  // default: the adjectives' base forms
}
```

```json
{
  "version": 1,
  "name": "example",
  "nouns": [
    { "g": "m", "nom": "Fuchs", "acc": "Fuchs" },
    { "g": "m", "nom": "Hase", "acc": "Hasen" },
    { "g": "f", "nom": "Tomate", "acc": "Tomate" },
    { "g": "n", "nom": "Pferd", "acc": "Pferd" }
  ],
  "adjectives": [
    { "base": "flink", "m": "flinker", "f": "flinke", "n": "flinkes", "accM": "flinken" },
    { "base": "rot", "m": "roter", "f": "rote", "n": "rotes", "accM": "roten" }
  ],
  "verbs": [
    { "base": "malen", "s3": "malt" },
    { "base": "sehen", "s3": "sieht" }
  ]
}
```

Adjective forms are the strong (article-less) forms: `m`/`f`/`n` nominative,
`accM` accusative masculine (accusative feminine/neuter equal the nominative).

`loadWordlist(data)` (or `Wordlist.load`) validates the data and throws a
`WordlistError` whose `issues` list every offending entry - nothing is dropped
silently:

- shape (required fields, gender `m`/`f`/`n`, non-empty lists);
- layout safety: words may only contain `a`-`x` and `A`-`X`;
- casing: nouns start with an uppercase letter, all other words are lowercase.

Entries whose surface form was already used by an earlier entry in the same
role (e.g. two nouns with nominative `Wetter`) are removed, keeping the first,
and listed in `wordlist.duplicates`; duplicates would otherwise make some
passphrases more likely than others. Together with the separators and the
noun capitalisation this makes passphrases uniquely decodable.

The library does not ship a wordlist.

### Randomness

All randomness comes from `globalThis.crypto.getRandomValues`, with rejection
sampling for unbiased integers (`randomInt`, `randomChoice`). For
deterministic tests a `RandomSource` can be injected:
`new SentenceGenerator(wordlist, rng)`.

## Legacy API: morphological dictionary and adjective-noun passwords

The original API is kept for backwards compatibility. `PasswordGenerator`
builds two-word passwords (`aktiverTisch`, `starkeTa$se42`) from a
morphological dictionary. New code should use `SentenceGenerator`: legacy
passwords are shorter, and simple-mode passwords may contain umlauts and `ß`.

### Loading a dictionary

```typescript
import { GermanMorphDict } from 'ger-morph-pw-gen/GermanMorphDict';
import { PasswordGenerator, PasswordMode } from 'ger-morph-pw-gen/PasswordGenerator';

// From a URL, with optional progress reporting
const dict = new GermanMorphDict(await fetch('https://example.com/german-dict.txt'), (progress) => {
    // percentage reaches 100 only when loading is complete. If the response is
    // compressed (content-encoding gzip etc.), progress.approximate is true:
    // content-length is then the compressed size.
    console.log(`Loading dictionary: ${progress.percentage.toFixed(0)}%`);
});
await dict.waitForReady();

// Or from a string
const dict2 = new GermanMorphDict(`
Tisch
Tisch NN,masc,nom,sing

aktiver
aktiv ADJ,masc,nom,sing,pos,strong
`);
```

`dict.filterWords(regex?, categories?, progressCallback?)` returns matching
entries (regexes with the `g` or `y` flag are supported).

### Generating passwords

```typescript
const generator = new PasswordGenerator(dict);

await generator.generatePassword(PasswordMode.SIMPLE);      // 'aktiverTisch'
await generator.generatePassword(PasswordMode.STRONG);      // 'starkeTa$se42'
await generator.generatePasswords(PasswordMode.STRONG, 5);  // 5 unique passwords
```

- **Simple mode**: adjective + noun with gender agreement; may contain umlauts.
- **Strong mode**: only layout-safe words (`a`-`x`, `A`-`X`) that contain an
  `S`/`s` or `I`/`i`; one of these letters (at a random position) is replaced by
  `$` or `!`, and two random digits are appended.

The adjective-noun pair is chosen uniformly among all distinct pairs, using
Web Crypto.

## API overview

```typescript
// SentenceGenerator
class SentenceGenerator {
    constructor(wordlist: Wordlist | WordlistData, rng?: RandomSource);
    readonly wordlist: Wordlist;
    generate(options?: SentenceOptions): GeneratedSentence;
    describeStrength(options?: SentenceOptions): StrengthReport;
}
function crackTimeEstimates(bits: number): CrackTimeEstimate[];
const ATTACKER_MODELS: readonly AttackerModel[];
const DEFAULT_SENTENCE_OPTIONS, SEPARATORS, TRAILING_SYMBOLS, MAX_DIGITS;

// Wordlist
function loadWordlist(data: unknown): Wordlist;   // = Wordlist.load
class WordlistError extends Error { readonly issues: readonly string[] }
function declineAdjective(adj: AdjEntry, gender: Gender, grammaticalCase: 'nom' | 'acc'): string;
function declineNoun(noun: NounEntry, grammaticalCase: 'nom' | 'acc'): string;

// LayoutSafety
function isLayoutSafe(text: string): boolean;
function isLayoutSafeWord(word: string): boolean;
function findLayoutUnsafeChars(text: string): string[];

// Random
type RandomSource = (array: Uint32Array) => Uint32Array;
function randomInt(maxExclusive: number, rng?: RandomSource): number;
function randomChoice<T>(items: readonly T[], rng?: RandomSource): T;

// Legacy
class GermanMorphDict {
    constructor(dictData: string | Response, progressCallback?: (progress: LoadProgress) => void);
    waitForReady(): Promise<void>;
    filterWords(regex?: RegExp, categories?: readonly WordCategory[],
                progressCallback?: (progress: FilterProgress) => void): Promise<readonly WordEntry[]>;
    getDictionary(): Promise<readonly WordEntry[]>;
}
class PasswordGenerator {
    constructor(dict: GermanMorphDict, rng?: RandomSource);
    generatePassword(mode: PasswordMode): Promise<string>;
    generatePasswords(mode: PasswordMode, count?: number): Promise<string[]>;
}
```

Everything is exported from the package root (`ger-morph-pw-gen`). Each module
can also be imported on its own: `ger-morph-pw-gen/SentenceGenerator`,
`/Wordlist`, `/LayoutSafety`, `/Random`, `/GermanMorphDict`,
`/PasswordGenerator`.

## Development

```bash
npm install
npm test        # jest with coverage thresholds
npm run build   # tsc; commit the generated .js/.d.ts files
```

```
ger-morph-pw-gen/
├── index.ts               # re-exports all modules
├── SentenceGenerator.ts   # sentence passphrases, strength, crack times
├── Wordlist.ts            # wordlist format, validation, declension helpers
├── LayoutSafety.ts        # QWERTZ/QWERTY-safe character set
├── Random.ts              # Web Crypto random integers (rejection sampling)
├── GermanMorphDict.ts     # legacy: morphological dictionary
├── PasswordGenerator.ts   # legacy: adjective-noun passwords
└── tests/
```

## License

MIT, see [LICENSE](LICENSE).
