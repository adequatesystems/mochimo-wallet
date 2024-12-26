import { NetworkService, TagResolveResponse, TransactionPushResponse, TagActivationResponse } from '../types/network';

export abstract class BaseNetworkService implements NetworkService {
    protected abstract apiUrl: string;

    async resolveTag(tag: string): Promise<TagResolveResponse> {
        try {
            const response = await fetch(`${this.apiUrl}/net/resolve/${tag}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error resolving tag:', error);
            throw error;
        }
    }

    async pushTransaction(transaction: string, recipients?: number): Promise<TransactionPushResponse> {
        try {
            const response = await fetch(`${this.apiUrl}/push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ transaction, recipients })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                status: 'success',
                data
            };
        } catch (error) {
            console.error('Error pushing transaction:', error);
            return {
                status: 'error',
                data: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async activateTag(wotsAddress: string): Promise<TagActivationResponse> {
        try {
            const response = await fetch(`${this.apiUrl}/fund/${wotsAddress}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error activating tag:', error);
            throw error;
        }
    }

    abstract getNetworkStatus(): Promise<{ height: number; nodes: any[] }>;
} 