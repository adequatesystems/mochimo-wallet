
export interface Amount {
    value: string;
    currency: {
        symbol: string;
        decimals: number;
    };
}

export interface NetworkIdentifier {
    blockchain: string;
    network: string;
}

export interface BlockIdentifier {
    index?: number;
    hash?: string;
}

export interface TransactionIdentifier {
    hash: string;
}

export interface Operation {
    operation_identifier: {
        index: number;
    };
    type: string;
    status: string;
    account: {
        address: string;
        metadata?: Record<string, any>;
    };
    amount: {
        value: string;  // Changed from number to string
        currency: {
            symbol: string;
            decimals: number;
        };
    };
}

export interface Transaction {
    transaction_identifier: TransactionIdentifier;
    operations: Operation[];
}

export interface Block {
    block_identifier: BlockIdentifier;
    parent_block_identifier: BlockIdentifier;
    timestamp: number;
    transactions: Transaction[];
}

export interface NetworkStatus {
    current_block_identifier: BlockIdentifier;
    genesis_block_identifier: BlockIdentifier;
    current_block_timestamp: number;
}

export interface NetworkOptions {
    version: {
        rosetta_version: string;
        node_version: string;
        middleware_version: string;
    };
    allow: {
        operation_statuses: Array<{
            status: string;
            successful: boolean;
        }>;
        operation_types: string[];
        errors: Array<{
            code: number;
            message: string;
            retriable: boolean;
        }>;
        mempool_coins: boolean;
        transaction_hash_case: string;
    };
}

export interface PublicKey {
    hex_bytes: string;
    curve_type: string;
}

export interface ConstructionDeriveRequest {
    network_identifier: NetworkIdentifier;
    public_key: PublicKey;
    metadata?: Record<string, any>;
}

export interface ConstructionDeriveResponse {
    account_identifier: {
        address: string;
        metadata?: {
            tag?: string;
        };
    };
    metadata?: Record<string, any>;
}

export interface ConstructionPreprocessRequest {
    network_identifier: NetworkIdentifier;
    operations: Operation[];
    metadata?: Record<string, any>;
}

export interface ConstructionPreprocessResponse {
    required_public_keys?: Array<{
        address: string;
        metadata?: {
            tag?: string;
        };
    }>;
    options?: {
        source_address?: string;
        source_tag?: string;
        change_address?: string;
        change_tag?: string;
        destination_tag?: string;
        amount?: string;
        fee?: string;
    };
}

export interface ConstructionMetadataRequest {
    network_identifier: NetworkIdentifier;
    options?: Record<string, any>;
    public_keys?: PublicKey[];
}

export interface ConstructionMetadataResponse {
    metadata: {
        source_balance?: string;
        source_nonce?: number;
        source_tag?: string;
        destination_tag?: string;
        change_tag?: string;
        suggested_fee?: string;
    };
    suggested_fee?: Amount[];
}

export interface ConstructionPayloadsRequest {
    network_identifier: NetworkIdentifier;
    operations: Operation[];
    metadata?: Record<string, any>;
    public_keys?: PublicKey[];
}

export interface ConstructionPayloadsResponse {
    unsigned_transaction: string;
    payloads: Array<{
        address: string;
        hex_bytes: string;
        signature_type: string;
        metadata?: {
            tag?: string;
        };
    }>;
}

export interface ConstructionParseRequest {
    network_identifier: NetworkIdentifier;
    signed: boolean;
    transaction: string;
}

export interface ConstructionParseResponse {
    operations: Operation[];
    account_identifier_signers?: { address: string }[];
    metadata?: Record<string, any>;
}

export interface ConstructionCombineRequest {
    network_identifier: NetworkIdentifier;
    unsigned_transaction: string;
    signatures: Signature[];
}

export interface ConstructionCombineResponse {
    signed_transaction: string;
}

export interface ConstructionHashRequest {
    network_identifier: NetworkIdentifier;
    signed_transaction: string;
}

export interface ConstructionHashResponse {
    transaction_identifier: TransactionIdentifier;
    metadata?: Record<string, any>;
}

export interface ConstructionSubmitRequest {
    network_identifier: NetworkIdentifier;
    signed_transaction: string;
}

export interface ConstructionSubmitResponse {
    transaction_identifier: TransactionIdentifier;
    metadata?: Record<string, any>;
}

export interface SigningPayload {
    hex_bytes: string;
    signature_type: string;
    address?: string;
}

export interface Signature {
    signing_payload: SigningPayload;
    public_key: PublicKey;
    signature_type: string;
    hex_bytes: string;
}
