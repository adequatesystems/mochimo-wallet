import { Block, BlockIdentifier, ConstructionCombineRequest, ConstructionCombineResponse, ConstructionDeriveRequest, ConstructionDeriveResponse, ConstructionHashRequest, ConstructionHashResponse, ConstructionMetadataRequest, ConstructionMetadataResponse, ConstructionParseRequest, ConstructionParseResponse, ConstructionPayloadsRequest, ConstructionPayloadsResponse, ConstructionPreprocessRequest, ConstructionPreprocessResponse, ConstructionSubmitRequest, ConstructionSubmitResponse, NetworkIdentifier, NetworkOptions, NetworkStatus, Operation, PublicKey, Signature } from "./types"

export interface WOTSKeyPair {
  privateKey: string
  publicKey: string
}

let reqIndex = 0;


export class MochimoRosettaClient {
  private baseUrl: string;
  public networkIdentifier: NetworkIdentifier;

  constructor(baseUrl: string = 'http://ip.leonapp.it:8081') {
    this.baseUrl = baseUrl;
    this.networkIdentifier = {
      blockchain: 'mochimo',
      network: 'mainnet'
    };
  }

  private async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();
    reqIndex++;
    if (!response.ok) {
      throw new Error(`API Error: ${JSON.stringify(responseData)}`);
    }

    return responseData;
  }

  async initialize(): Promise<{ status: NetworkStatus, options: NetworkOptions }> {
    const [status, options] = await Promise.all([
      this.getNetworkStatus(),
      this.getNetworkOptions()
    ]);
    return { status, options };
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    return this.post<NetworkStatus>('/network/status', {
      network_identifier: this.networkIdentifier
    });
  }

  async getNetworkOptions(): Promise<NetworkOptions> {
    return this.post<NetworkOptions>('/network/options', {
      network_identifier: this.networkIdentifier
    });
  }

  async getBlock(identifier: BlockIdentifier): Promise<{ block: Block }> {
    return this.post<{ block: Block }>('/block', {
      network_identifier: this.networkIdentifier,
      block_identifier: identifier
    });
  }

  async getAccountBalance(address: string): Promise<any> {
    return this.post('/account/balance', {
      network_identifier: this.networkIdentifier,
      account_identifier: { address }
    });
  }

  // get mempool
  async getMempool(): Promise<any> {
    return this.post('/mempool', {
      network_identifier: this.networkIdentifier
    });
  }

  async constructionDerive(publicKey: string, curveType: string = 'wotsp'): Promise<ConstructionDeriveResponse> {
    const request: ConstructionDeriveRequest = {
      network_identifier: this.networkIdentifier,
      public_key: {
        hex_bytes: publicKey,
        curve_type: curveType
      }
    };

    return this.post<ConstructionDeriveResponse>('/construction/derive', request);
  }

  async constructionPreprocess(operations: Operation[], metadata?: Record<string, any>): Promise<ConstructionPreprocessResponse> {
    const request: ConstructionPreprocessRequest = {
      network_identifier: this.networkIdentifier,
      operations,
      metadata
    };
    return this.post<ConstructionPreprocessResponse>('/construction/preprocess', request);
  }

  async constructionMetadata(options?: Record<string, any>, publicKeys?: PublicKey[]): Promise<ConstructionMetadataResponse> {
    const request: ConstructionMetadataRequest = {
      network_identifier: this.networkIdentifier,
      options,
      public_keys: publicKeys
    };
    return this.post<ConstructionMetadataResponse>('/construction/metadata', request);
  }

  async constructionPayloads(
    operations: Operation[],
    metadata?: Record<string, any>,
    publicKeys?: PublicKey[]
  ): Promise<ConstructionPayloadsResponse> {
    const request: ConstructionPayloadsRequest = {
      network_identifier: this.networkIdentifier,
      operations,
      metadata,
      public_keys: publicKeys
    };
    return this.post<ConstructionPayloadsResponse>('/construction/payloads', request);
  }

  async constructionParse(
    transaction: string,
    signed: boolean
  ): Promise<ConstructionParseResponse> {
    const request: ConstructionParseRequest = {
      network_identifier: this.networkIdentifier,
      signed,
      transaction
    };
    return this.post<ConstructionParseResponse>('/construction/parse', request);
  }

  async constructionCombine(
    unsignedTransaction: string,
    signatures: Signature[]
  ): Promise<ConstructionCombineResponse> {
    const request: ConstructionCombineRequest = {
      network_identifier: this.networkIdentifier,
      unsigned_transaction: unsignedTransaction,
      signatures
    };
    return this.post<ConstructionCombineResponse>('/construction/combine', request);
  }

  async constructionHash(signedTransaction: string): Promise<ConstructionHashResponse> {
    const request: ConstructionHashRequest = {
      network_identifier: this.networkIdentifier,
      signed_transaction: signedTransaction
    };
    return this.post<ConstructionHashResponse>('/construction/hash', request);
  }

  async constructionSubmit(signedTransaction: string): Promise<ConstructionSubmitResponse> {
    const request: ConstructionSubmitRequest = {
      network_identifier: this.networkIdentifier,
      signed_transaction: signedTransaction
    };
    return this.post<ConstructionSubmitResponse>('/construction/submit', request);
  }
}

