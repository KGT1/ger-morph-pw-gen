import { GermanMorphDict, WordCategory } from '../GermanMorphDict';

// Test data
const testData = `
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
`;

describe('GermanMorphDict', () => {
    it('should filter words by regex and category', async () => {
        const dict = new GermanMorphDict(testData);
        const filteredWords = await dict.filterWords(/Z[a-e][a-z]*/, [WordCategory.NOUN]);
        expect(filteredWords.length).toBe(6);
        // Should have 5 unique words, with Zelt appearing twice
        const uniqueWords = new Set(filteredWords.map(w => w.word));
        expect(uniqueWords.size).toBe(5);
        expect(Array.from(uniqueWords).sort()).toEqual(['Zahn', 'Zange', 'Zaun', 'Zebra', 'Zelt'].sort());
        // Verify Zelt appears twice with different genders
        const zeltEntries = filteredWords.filter(w => w.word === 'Zelt');
        expect(zeltEntries.length).toBe(2);
        const zeltGenders = zeltEntries.map(e => e.analysis.attributes[0]);
        expect(zeltGenders).toContain('neut');
        expect(zeltGenders).toContain('masc');
    });

    it('should combine filters', async () => {
        const dict = new GermanMorphDict(testData);
        const combinedFilter = await dict.combineFilters(/akt.*/, [WordCategory.ADJECTIVE]);
        expect(combinedFilter.length).toBe(6);
        expect(combinedFilter.map(w => w.word).sort()).toEqual(['aktiver', 'aktiverer', 'aktiveres', 'aktives', 'aktivster', 'aktivstes'].sort());
    });

    it('should track loading progress', async () => {
        const progressUpdates: number[] = [];
        const dict = new GermanMorphDict(testData, (progress) => {
            progressUpdates.push(progress.percentage);
        });
        await dict.waitForReady();
        expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it('should track filtering progress', async () => {
        const dict = new GermanMorphDict(testData);
        const progressUpdates: number[] = [];
        
        await dict.filterWords(/.*/, undefined, (progress) => {
            progressUpdates.push(progress.percentage);
        });
        expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it('should handle empty filters', async () => {
        const dict = new GermanMorphDict(testData);
        const noMatches = await dict.filterWords(/xyz123/);
        expect(noMatches.length).toBe(0);
    });

    it('should preserve morphological variations', async () => {
        const dict = new GermanMorphDict(testData);
        // Zelt has two entries with different genders
        const results = await dict.filterWords(/Zelt/);
        expect(results.length).toBe(2);
        
        // Since we expect exactly 2 results, we can safely assert their existence
        const firstResult = results[0];
        const secondResult = results[1];
        
        expect(firstResult).toBeDefined();
        expect(secondResult).toBeDefined();
        
        if (!firstResult || !secondResult) {
            throw new Error('Expected two results for Zelt');
        }
        
        expect(firstResult.word).toBe('Zelt');
        expect(secondResult.word).toBe('Zelt');
        
        // Verify we have both gender variations
        const genders = results.map(r => r.analysis.attributes[0]);
        expect(genders).toContain('neut');
        expect(genders).toContain('masc');
    });

    it('should load dictionary from Response stream', async () => {
        // Create a mock Response with a ReadableStream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                // Split test data into chunks by lines to simulate streaming
                const lines = testData.split('\n');
                let currentChunk = '';
                const chunkSize = 10; // Process 10 lines at a time
                
                for (let i = 0; i < lines.length; i += chunkSize) {
                    currentChunk = lines.slice(i, i + chunkSize).join('\n') + '\n';
                    controller.enqueue(encoder.encode(currentChunk));
                }
                controller.close();
            }
        });

        const mockResponse = new Response(stream, {
            headers: {
                'content-length': testData.length.toString()
            }
        });

        const progressUpdates: number[] = [];
        const dict = new GermanMorphDict(mockResponse, (progress) => {
            progressUpdates.push(progress.percentage);
        });

        // Wait for dictionary to load
        await dict.waitForReady();

        // Verify dictionary was loaded correctly
        const results = await dict.filterWords(/Zelt/);
        expect(results.length).toBe(2);
        expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });
});
