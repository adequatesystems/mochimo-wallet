import { vi } from 'vitest';
export const deriveWotsSeedAndAddress = vi.fn().mockImplementation(() => ({
    seed: Buffer.from('0000000000000000000000000000000000000000'),
    address: Buffer.from('0000000000000000000000000000000000000000')
})); 