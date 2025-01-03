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

    it('should decode MCM file correctly', async () => {
        const mcmBuffer = await loadTestFile();
        
        try {
            const result = await MCMDecoder.decode(mcmBuffer, 'kandokando');

            // Verify structure
            expect(result.publicHeader).toBeDefined();
            expect(result.privateHeader).toBeDefined();
            expect(Array.isArray(result.entries)).toBe(true);

            // Log results for inspection
            console.log('\nDecoding Results:');
            console.log('Public Header:', JSON.stringify(result.publicHeader, null, 2));
            console.log('Private Header:', JSON.stringify(result.privateHeader, null, 2));
            console.log('Entries:', result.entries.map(e => ({
                name: e.name,
                address: e.address.substring(0, 10) + '...',
                hasSecret: !!e.secret
            })));
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