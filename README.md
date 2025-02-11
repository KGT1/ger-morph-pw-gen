# German Morphological Password Generator

A TypeScript/JavaScript library that generates secure passwords using German adjective-noun combinations. The library uses morphological analysis to ensure grammatically correct combinations.

## Installation

### Publishing to GitHub

1. Create a new GitHub repository named `ger-morph-pw-gen`
2. Initialize git and push the code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/ger-morph-pw-gen.git
git push -u origin main
```

### Installing in Your Project

#### From GitHub
```bash
# Using npm
npm install git+https://github.com/yourusername/ger-morph-pw-gen.git

# Using yarn
yarn add git+https://github.com/yourusername/ger-morph-pw-gen.git
```

## Usage

### Loading Dictionary Data

You can load the dictionary data in several ways:

1. **From a URL:**
```typescript
import { GermanMorphDict } from 'ger-morph-pw-gen';
import { PasswordGenerator, PasswordMode } from 'ger-morph-pw-gen/PasswordGenerator';

// Load dictionary from a URL
const response = await fetch('https://example.com/german-dict.txt');
const dict = new GermanMorphDict(response);

// Optional: Track loading progress
const dict = new GermanMorphDict(response, (progress) => {
    console.log(`Loading dictionary: ${progress.percentage.toFixed(1)}%`);
});

await dict.waitForReady(); // Wait for dictionary to load
const generator = new PasswordGenerator(dict);
```

2. **From a String:**
```typescript
// Load dictionary from a string (e.g., embedded in your code or loaded from a file)
const dictData = `
Tisch
Tisch NN,masc,nom,sing

stark
stark ADJ,masc,nom,sing,pos,strong
`;

const dict = new GermanMorphDict(dictData);
await dict.waitForReady();
const generator = new PasswordGenerator(dict);
```

### Generating Passwords

1. **Simple Mode** - Basic adjective-noun combinations:
```typescript
// Generate a single password
const password = await generator.generatePassword(PasswordMode.SIMPLE);
// Example: "aktiverTisch", "schnelleKatze", "großesHaus"

// Generate multiple unique passwords
const passwords = await generator.generatePasswords(PasswordMode.SIMPLE, 5);
// Returns array of 5 unique passwords
```

2. **Strong Mode** - Enhanced security features:
```typescript
// Generate a single strong password
const password = await generator.generatePassword(PasswordMode.STRONG);
// Example: "starke$Tisch42", "sichere!Turm91", "stille+Strasse73"

// Generate multiple unique strong passwords
const passwords = await generator.generatePasswords(PasswordMode.STRONG, 5);
// Returns array of 5 unique strong passwords
```

Strong mode passwords:
- Contain at least one S, s, I, i, T, or t
- Replace one of these letters with $, !, or +
- Filter out Ä, Ö, Ü, ẞ, y, and z
- Add two random digits at the end

### Error Handling
```typescript
try {
    const password = await generator.generatePassword(PasswordMode.STRONG);
} catch (error) {
    console.error('Failed to generate password:', error.message);
}
```

## Password Generation Modes

### Simple Mode
- Combines a German adjective with a noun
- Maintains correct grammatical gender agreement
- Allows all German characters including umlauts (ä, ö, ü)
- Example: "aktiverTisch"

### Strong Mode
- Builds upon simple mode with additional security features:
- Ensures the adjective-noun combination contains at least one of: S, s, I, i, T, t
- Replaces one of these characters with a special character ($, !, or +)
- Filters out words containing: Ä, Ö, Ü, ẞ, y, z
- Adds two random digits at the end
- Example: "starke$Turm42"

## API Reference

### GermanMorphDict

The main class for loading and managing the German morphological dictionary.

```typescript
constructor(dictData: string | Response, progressCallback?: (progress: LoadProgress) => void)
```

### PasswordGenerator

The class for generating passwords using the morphological dictionary.

```typescript
constructor(dict: GermanMorphDict)

// Generate a single password
async generatePassword(mode: PasswordMode): Promise<string>

// Generate multiple unique passwords
async generatePasswords(mode: PasswordMode, count: number = 10): Promise<string[]>
```

### PasswordMode

Enum defining available password generation modes:

```typescript
enum PasswordMode {
    SIMPLE = "simple",
    STRONG = "strong"
}
```

## License

ISC

## Development

### Building the Project
```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build
```

### Project Structure
```
ger-morph-pw-gen/
├── src/
│   ├── GermanMorphDict.ts     # Core dictionary functionality
│   └── PasswordGenerator.ts    # Password generation logic
├── tests/
│   ├── GermanMorphDict.test.ts
│   └── PasswordGenerator.test.ts
├── package.json
└── tsconfig.json
```

Note: Before using the package, make sure to:
1. Replace `yourusername` in the installation URLs with your actual GitHub username
2. Have a German morphological dictionary file available (either hosted somewhere or embedded in your code)
