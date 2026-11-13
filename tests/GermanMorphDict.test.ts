import { FilterProgress, GermanMorphDict, LoadProgress, WordCategory } from '../GermanMorphDict';

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

    describe('streaming', () => {
        // Small dictionary with multi-byte UTF-8 characters and no trailing
        // newline, so the last word is only terminated by the end of the stream.
        const streamData =
            'Würfel\nWürfel NN,masc,nom,sing\n\n' +
            'Zelt\nZelt NN,neut,nom,sing\nZelt NN,masc,nom,sing\n\n' +
            'berühmter\nberühmt ADJ,masc,nom,sing,pos,strong\n\n' +
            'Straße\nStraße NN,fem,nom,sing';
        const expectedWords = ['Straße', 'Würfel', 'Zelt', 'berühmter'];
        const streamBytes = new TextEncoder().encode(streamData);

        /** Builds a Response whose body is delivered as the given byte chunks */
        const responseFromChunks = (
            chunks: readonly Uint8Array[],
            headers: Record<string, string> = {}
        ): Response => {
            const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                    for (const chunk of chunks) {
                        controller.enqueue(chunk);
                    }
                    controller.close();
                }
            });
            return new Response(stream, { headers });
        };

        const loadedWords = async (dict: GermanMorphDict): Promise<string[]> => {
            const entries = await dict.getDictionary();
            return [...new Set(entries.map(e => e.word))].sort();
        };

        it('should not lose any word when split at every possible byte boundary', async () => {
            for (let i = 0; i <= streamBytes.length; i++) {
                const dict = new GermanMorphDict(responseFromChunks([
                    streamBytes.slice(0, i),
                    streamBytes.slice(i)
                ]));
                expect({ split: i, words: await loadedWords(dict) })
                    .toEqual({ split: i, words: expectedWords });
                expect((await dict.filterWords(/^Zelt$/)).length).toBe(2);
            }
        });

        it('should not lose any word when every byte is its own chunk', async () => {
            const chunks = Array.from(streamBytes, (_, i) => streamBytes.slice(i, i + 1));
            const dict = new GermanMorphDict(responseFromChunks(chunks));
            expect(await loadedWords(dict)).toEqual(expectedWords);
            const zelt = await dict.filterWords(/^Zelt$/);
            expect(zelt.map(e => e.analysis.attributes[0]).sort()).toEqual(['masc', 'neut']);
        });

        it('should report exact, clamped progress for identity encoding', async () => {
            const updates: LoadProgress[] = [];
            const half = Math.floor(streamBytes.length / 2);
            const dict = new GermanMorphDict(
                responseFromChunks(
                    [streamBytes.slice(0, half), streamBytes.slice(half)],
                    // Deliberately too small to check clamping
                    { 'content-length': String(half) }
                ),
                p => updates.push(p)
            );
            await dict.waitForReady();
            expect(updates.length).toBe(3);
            expect(updates.every(u => !u.approximate)).toBe(true);
            expect(updates.every(u => u.percentage >= 0 && u.percentage <= 100)).toBe(true);
            expect(updates[0]?.percentage).toBe(99);
            expect(updates[1]?.percentage).toBe(99);
            expect(updates[2]?.percentage).toBe(100);
        });

        it('should flag progress as approximate for compressed responses', async () => {
            const updates: LoadProgress[] = [];
            // content-length of a gzip response is the compressed size, which
            // is smaller than the decoded body that is actually read.
            const dict = new GermanMorphDict(
                responseFromChunks([streamBytes], {
                    'content-length': '10',
                    'content-encoding': 'gzip'
                }),
                p => updates.push(p)
            );
            await dict.waitForReady();
            expect(updates.length).toBeGreaterThan(0);
            expect(updates.every(u => u.approximate)).toBe(true);
            expect(Math.max(...updates.map(u => u.percentage))).toBe(100);
            expect(updates[updates.length - 1]?.percentage).toBe(100);
        });

        it('should report completion without content-length', async () => {
            const updates: LoadProgress[] = [];
            const dict = new GermanMorphDict(responseFromChunks([streamBytes]), p => updates.push(p));
            await dict.waitForReady();
            expect(updates).toEqual([{
                totalLines: 0,
                processedLines: streamBytes.length,
                percentage: 100,
                approximate: false
            }]);
        });

        it('should reject when the response body is null', async () => {
            const dict = new GermanMorphDict(new Response(null));
            await expect(dict.waitForReady()).rejects.toThrow('Response body is null');
        });

        it('should wrap stream errors', async () => {
            const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.error(new Error('network down'));
                }
            });
            const dict = new GermanMorphDict(new Response(stream));
            await expect(dict.waitForReady()).rejects.toThrow('Failed to load dictionary: network down');
        });

        it('should wrap non-Error stream failures', async () => {
            const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.error('boom');
                }
            });
            const dict = new GermanMorphDict(new Response(stream));
            await expect(dict.waitForReady()).rejects.toThrow('Failed to load dictionary: Unknown error');
        });
    });

    describe('parsing', () => {
        it('should keep the last word of a string without trailing newline', async () => {
            const dict = new GermanMorphDict('Tisch\nTisch NN,masc,nom,sing');
            expect((await dict.getDictionary()).map(e => e.word)).toEqual(['Tisch']);
        });

        it('should skip malformed analysis lines and unknown categories', async () => {
            const dict = new GermanMorphDict([
                'Tisch',
                'Tisch,',
                ' ,x',
                'Tisch FOO,masc',
                'Tisch NN,masc,nom,sing',
                '',
                'Leer',
                'Leer XYZ,abc'
            ].join('\n'));
            const entries = await dict.getDictionary();
            expect(entries.length).toBe(1);
            expect(entries[0]?.analysis).toEqual({
                lemma: 'Tisch',
                category: WordCategory.NOUN,
                attributes: ['masc', 'nom', 'sing']
            });
        });
    });

    describe('filterWordsGenerator', () => {
        it('should match every word with a global regex', async () => {
            const dict = new GermanMorphDict(testData);
            await dict.waitForReady();
            const global = [...dict.filterWordsGenerator(/^W/g, [WordCategory.NOUN])];
            const plain = [...dict.filterWordsGenerator(/^W/, [WordCategory.NOUN])];
            expect(plain.length).toBe(8); // 7 words, Wetter has two noun analyses
            expect(global).toEqual(plain);
        });

        it('should match every word with a sticky regex', async () => {
            const dict = new GermanMorphDict(testData);
            const sticky = await dict.filterWords(/Z/y);
            expect(new Set(sticky.map(e => e.word)).size).toBe(8);
        });
    });

    it('should report filtering progress every 1000 entries', async () => {
        const lines: string[] = [];
        for (let i = 0; i < 2500; i++) {
            lines.push(`Wort${i}`, `Wort${i} NN,neut,nom,sing`, '');
        }
        const dict = new GermanMorphDict(lines.join('\n'));
        const updates: FilterProgress[] = [];
        const result = await dict.filterWords(undefined, undefined, p => updates.push(p));
        expect(result.length).toBe(2500);
        expect(updates.map(u => u.processedEntries)).toEqual([1000, 2000, 2500]);
        expect(updates.map(u => u.percentage)).toEqual([40, 80, 100]);
    });
});
