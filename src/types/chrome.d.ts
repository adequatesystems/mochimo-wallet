interface StorageArea {
    get(keys?: string | string[] | object): Promise<{ [key: string]: any }>;
    set(items: object): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
}

declare namespace chrome.storage {
    export const sync: StorageArea;
    export const local: StorageArea;
} 