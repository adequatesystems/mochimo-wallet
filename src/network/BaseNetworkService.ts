import { NetworkService, TagResolveResponse, TransactionResponse, TagActivationResponse } from '../types/network';

export abstract class BaseNetworkService implements NetworkService {
    protected abstract apiUrl: string;

    async resolveTag(tag: string): Promise<TagResolveResponse> {
        throw new Error("Method not implemented.");
    }

    async pushTransaction(transaction: string, recipients?: number): Promise<TransactionResponse> {
       throw new Error("Method not implemented.");
    }

    async activateTag(wotsAddress: string): Promise<TagActivationResponse> {
        throw new Error("Method not implemented.");
    }

    abstract getNetworkStatus(): Promise<{ height: number; nodes: any[] }>;
} 