import { describe, it, expect } from 'vitest';
import { MCMDecoder } from '../../../src/crypto/mcmDecoder';
import fs from 'fs/promises';
import path from 'path';

describe('MCMDecoder', () => {
    const loadTestFile = async () => {
        const mcmPath = path.join(__dirname, '../../fixtures/test.mcm');
        const mcmFile = await fs.readFile(mcmPath);
        console.log('MCM file size:', mcmFile.length, 'bytes');
        return mcmFile.buffer;
    };

    it.only('should decode MCM file correctly', async () => {
        const mcmBuffer = await loadTestFile();

        try {
            const result = await MCMDecoder.decode(mcmBuffer, 'kandokando');

            // Verify structure
            expect(result.publicHeader).toBeDefined();
            expect(result.privateHeader).toBeDefined();
            expect(Array.isArray(result.entries)).toBe(true);

            // Verify deterministic secrets
            const deterministicSeed = Buffer.from(result.privateHeader['deterministic seed hex'], 'hex');
            console.log('\nVerifying secrets:');
            result.entries.slice(0, 1).forEach((entry, index) => {
                const tagHex = entry.address.substring(entry.address.length - 24)
                const expectedSecret = MCMDecoder.generateDeterministicSecret(deterministicSeed, index, tagHex);
                console.log(`Entry ${index}:`);
                console.log('Expected:', Buffer.from(expectedSecret.secret).toString('hex'));
                console.log('Actual:', entry.secret);
                console.log('Match:', entry.secret === Buffer.from(expectedSecret.secret).toString('hex'));
                console.log('Address Match:', entry.address === Buffer.from(expectedSecret.address).toString('hex'));
                console.log('Actual Address:', entry.address);
                console.log('Expected Address:', Buffer.from(expectedSecret.address).toString('hex'));
            });

            // Log results for inspection
            console.log('\nDecoding Results:');
            console.log('Public Header:', JSON.stringify(result.publicHeader, null, 2));
            console.log('Private Header:', JSON.stringify(result.privateHeader, null, 2));
            console.log('Entries:', result.entries.slice(0,1).map((e, index) => {
                const tagHex = e.address.substring(e.address.length - 24)
                const sec = MCMDecoder.generateDeterministicSecret(deterministicSeed, index, tagHex)
                return {
                    name: e.name,
                    address: e.address.substring(0, 10) + '...' + tagHex,
                    secretMatch: e.secret === Buffer.from(sec.secret).toString('hex'),
                    addressMatch: e.address === Buffer.from(sec.address).toString('hex')
                }
            }));
        } catch (error) {
            console.error('Test error:', error);
            throw error;
        }
    });

    it('should handle invalid password', async () => {
        const mcmBuffer = await loadTestFile();

        await expect(async () => {
            await MCMDecoder.decode(mcmBuffer, 'wrongpassword');
        }).rejects.toThrow(/Failed to decode MCM file: .*password/i);
    });

    it('should handle corrupted file', async () => {
        const corruptBuffer = new ArrayBuffer(100);

        await expect(async () => {
            await MCMDecoder.decode(corruptBuffer, 'anypassword');
        }).rejects.toThrow('Failed to decode MCM file');
    });
}); 