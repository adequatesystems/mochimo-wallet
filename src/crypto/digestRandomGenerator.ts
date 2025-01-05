import CryptoJS from 'crypto-js';

export function intToBytes(num: number): Uint8Array {
    return new Uint8Array([
        (num >> 24) & 0xff,
        (num >> 16) & 0xff,
        (num >> 8) & 0xff,
        num & 0xff
    ]);
}

export function wordArrayToBytes(wordArray: any): Uint8Array {
    const words = wordArray.words;
    const bytes = new Uint8Array(words.length * 4);
    for (let i = 0; i < words.length * 4; i++) {
        bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return bytes;
}

export class DigestRandomGenerator {
    private static CYCLE_COUNT = 10;
    private stateCounter: number = 1;
    private seedCounter: number = 1;
    private state: Uint8Array;
    private seed: Uint8Array;

    constructor() {
        this.seed = new Uint8Array(64).fill(0);
        this.state = new Uint8Array(64).fill(0);
        // console.log('Initial seed:', Buffer.from(this.seed).toString('hex'));
        // console.log('Initial state:', Buffer.from(this.state).toString('hex'));
    }

    private digestAddCounter(counter: number): Uint8Array {
        // Pre-allocate buffer
        const bytes = new Uint8Array(8);
        // Unroll loop for performance
        bytes[0] = counter & 0xff;
        bytes[1] = (counter >>> 8) & 0xff;
        bytes[2] = (counter >>> 16) & 0xff;
        bytes[3] = (counter >>> 24) & 0xff;
        bytes[4] = 0;
        bytes[5] = 0;
        bytes[6] = 0;
        bytes[7] = 0;
        return bytes;
    }

    private digest(data: Uint8Array): Uint8Array {
        // Avoid array spread operations
        const wordArray = CryptoJS.lib.WordArray.create(data);
        const hash = CryptoJS.SHA512(wordArray);
        return wordArrayToBytes(hash);
    }

    private cycleSeed(): void {
        // console.log('Cycling seed...');
        const counterBytes = this.digestAddCounter(this.seedCounter++);
        const input = [...this.seed, ...counterBytes];
        this.seed = this.digest(new Uint8Array(input));
        // console.log('New seed after cycle:', Buffer.from(this.seed).toString('hex'));
    }

    private generateState(): void {
        // console.log('\nGenerating state...');
        // console.log('Current state:', Buffer.from(this.state).toString('hex'));
        // console.log('Current seed:', Buffer.from(this.seed).toString('hex'));
        
        const counterBytes = this.digestAddCounter(this.stateCounter++);
        const input = [...counterBytes, ...this.state, ...this.seed];
        this.state = this.digest(new Uint8Array(input));
        
        if (this.stateCounter % DigestRandomGenerator.CYCLE_COUNT === 0) {
            this.cycleSeed();
        }
    }

    addSeedMaterial(seed: Uint8Array): void {
        // console.log('\nAdding seed material:', Buffer.from(seed).toString('hex'));
        const input = [...seed, ...this.seed];
        this.seed = this.digest(new Uint8Array(input));
        // console.log('Seed after adding material:', Buffer.from(this.seed).toString('hex'));
    }

    nextBytes(length: number): Uint8Array {
        const result = new Uint8Array(length);
        let index = 0;
        
        // Calculate needed iterations
        const iterations = Math.ceil(length / this.state.length);
        
        // Pre-generate all states
        for (let i = 0; i < iterations; i++) {
            this.generateState();
            const remaining = length - index;
            const copyLength = Math.min(this.state.length, remaining);
            result.set(this.state.subarray(0, copyLength), index);
            index += copyLength;
        }
        
        return result;
    }
}