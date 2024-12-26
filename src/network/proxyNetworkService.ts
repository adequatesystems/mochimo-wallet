import { NetworkService, TagActivationResponse, TagResolveResponse, TransactionPushResponse } from "../types/network";
export class ProxyNetworkService implements NetworkService {
    protected apiUrl: string;
    getNetworkStatus(): Promise<{ height: number; nodes: any[]; }> {
        throw new Error("Method not implemented.");
    }
    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

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

}
