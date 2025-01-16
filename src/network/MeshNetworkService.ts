import { NetworkService, TagActivationResponse, TagResolveResponse, TransactionResponse } from "../types/network";
import { BaseNetworkService } from "./BaseNetworkService";
import { MochimoApiClient } from "mochimo-mesh-api-client";
export class MeshNetworkService implements NetworkService {
    public apiUrl: string;
    private apiClient: MochimoApiClient;
    
    getNetworkStatus(): Promise<{ height: number; nodes: any[]; }> {
        return this.apiClient.getNetworkStatus().then(res=>{
            return {
                height: parseInt(res?.current_block_identifier?.index?.toString() ?? '0'),
                nodes: []
            }
        })
    }
    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
        this.apiClient = new MochimoApiClient(apiUrl);
    }
    getBalance(tag: string): Promise<string> {
        return this.apiClient.getAccountBalance(tag).then(res=>{
            return res.balances[0].value
        }).catch(err=>{
            if(err.message.includes('Account not found')){
                return '0'
            }
            throw err
        })
    }

    resolveTag(tag: string): Promise<TagResolveResponse> {
        return this.apiClient.resolveTag("0x"+tag).then(res => {
            return {
                success: true,
                unanimous: true,
                addressConsensus: res.result.address,
                balanceConsensus: res.result.amount,
                quorum: []
            }
        })
    }

    async pushTransaction(transaction: string, recipients?: number): Promise<TransactionResponse> {
        try {
            const result = await this.apiClient.submit(transaction)
            return {
                status: 'success',
                data: {
                    sent: 0,
                    txid: result.transaction_identifier.hash,
                },
            }
        } catch (err) {
            return {
                status: 'error',
                error: 'Could not submit transaction'
            }
        }
    }

    activateTag(wotsAddress: string): Promise<TagActivationResponse> {
        return Promise.resolve({ status: 'success', data: { txid: '',amount: '' }, message: 'Successfully activated tag' })
    }

}