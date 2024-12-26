export class MockLocalStorage implements Storage {
    private data: { [key: string]: string } = {};
    
    // Required Storage interface properties
    length: number = 0;
    
    // Required Storage interface methods
    key(index: number): string | null {
        return Object.keys(this.data)[index] || null;
    }
    
    getItem(key: string): string | null {
        return this.data[key] || null;
    }

    setItem(key: string, value: string): void {
        this.data[key] = value;
        this.length = Object.keys(this.data).length;
    }

    removeItem(key: string): void {
        delete this.data[key];
        this.length = Object.keys(this.data).length;
    }

    clear(): void {
        this.data = {};
        this.length = 0;
    }
}

// Setup global localStorage mock
global.localStorage = new MockLocalStorage(); 