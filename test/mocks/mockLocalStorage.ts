export class MockLocalStorage implements Storage {
    private store: { [key: string]: string } = {};

    clear() {
        this.store = {};
    }

    getItem(key: string): string | null {
        return this.store[key] || null;
    }

    setItem(key: string, value: string) {
        this.store[key] = value;
    }

    removeItem(key: string) {
        delete this.store[key];
    }
}

// Replace global localStorage with mock for tests
global.localStorage = new MockLocalStorage(); 