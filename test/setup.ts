import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { StorageProvider } from '../src/redux/context/StorageContext';
import { MockStorage } from './mocks/MockStorage';

// Setup storage before tests
beforeEach(() => {
    const mockStorage = new MockStorage();
    StorageProvider.setStorage(mockStorage);
});

// Cleanup after tests
afterEach(() => {
    vi.clearAllMocks();
}); 