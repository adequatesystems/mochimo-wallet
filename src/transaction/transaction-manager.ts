import { MochimoHasher, WOTSWallet } from "mochimo-wots-v2";
import { MochimoRosettaClient } from "../network/rosetta/api";
import { TransactionIdentifier, Operation, Signature } from "../network/rosetta/types";

export class TransactionManager {

    private client: MochimoRosettaClient;

    private receiver_tag: string;
    private senderWallet: WOTSWallet;
    private changeWallet: WOTSWallet;

    public status_string: string = 'Initializing...';

    constructor(client: MochimoRosettaClient, sourceWallet: WOTSWallet, changeWallet: WOTSWallet, receiver_tag: string) {
        this.client = client;
        this.status_string = 'Generating public key from seed...';
        this.senderWallet = sourceWallet;

        this.status_string = 'Generating change public key from seed...';
        this.changeWallet = changeWallet;
        if (this.senderWallet.getAddressHex() === this.changeWallet.getAddressHex()) {
            throw new Error("Change wallet cannot be the same as sender wallet");
        }
        this.receiver_tag = receiver_tag;
        this.status_string = 'Initialized';
    }

    async sendTransaction(amount: bigint, miner_fee: bigint): Promise<TransactionIdentifier> {
        const all = await this.client.initialize()
        console.log(all)
        // Derive sender address
        this.status_string = 'Deriving the address from API...';
        const senderResponse = await this.client.constructionDerive('0x' + this.senderWallet.getAddressHex()!);
        const senderAddress = senderResponse.account_identifier;

        // Derive change address
        this.status_string = 'Deriving the change address from API...';
        const changeResponse = await this.client.constructionDerive(this.changeWallet.getAddressHex()!);
        const changeAddress = changeResponse.account_identifier;

        const operations: Operation[] = [
            {
                operation_identifier: { index: 0 },
                type: 'TRANSFER',
                status: 'SUCCESS',
                account: senderAddress,
                amount: {
                    value: '0',  // Changed to string
                    currency: {
                        symbol: 'MCM',
                        decimals: 0
                    }
                }
            },
            {
                operation_identifier: { index: 1 },
                type: 'TRANSFER',
                status: 'SUCCESS',
                account: {
                    address: "0x" + this.receiver_tag,
                },
                amount: {
                    value: '0',  // Changed to string
                    currency: {
                        symbol: 'MCM',
                        decimals: 0
                    }
                }
            },
            {
                operation_identifier: { index: 2 },
                type: 'TRANSFER',
                status: 'SUCCESS',
                account: changeAddress,
                amount: {
                    value: '0',  // Changed to string
                    currency: {
                        symbol: 'MCM',
                        decimals: 0
                    }
                }
            }
        ];

        // Preprocess
        this.status_string = 'Preprocessing transaction...';
        console.log("status_string", this.status_string);
        const preprocessResponse = await this.client.constructionPreprocess(operations);
        console.log("preprocessResponse", preprocessResponse);
        // Get resolved tags and source balance
        this.status_string = 'Getting transaction metadata...';
        console.log("status_string", this.status_string);
        const metadataResponse = await this.client.constructionMetadata(preprocessResponse.options);
        console.log("metadataResponse", metadataResponse);
        const senderBalance: bigint = BigInt(metadataResponse.metadata.source_balance || '0');
        operations[0].amount.value = (senderBalance).toString();  // Fix negative conversion
        operations[1].amount.value = amount.toString();
        operations[2].amount.value = (senderBalance - amount - miner_fee).toString();

        // Append operation 3 mining fee
        operations.push({
            operation_identifier: { index: 3 },
            type: 'TRANSFER',
            status: 'SUCCESS',
            account: {
                address: ''
            },
            amount: {
                value: String(miner_fee),  // Convert to string
                currency: {
                    symbol: 'MCM',
                    decimals: 0
                }
            }
        });

        // Prepare payloads
        this.status_string = 'Preparing transaction payloads...';
        console.log("status_string", this.status_string);
        const payloadsResponse = await this.client.constructionPayloads(
            operations,
            metadataResponse.metadata,
        );

        // Parse unsigned transaction to verify correctness
        this.status_string = 'Parsing unsigned transaction...';
        console.log("status_string", this.status_string);
        const parseResponse = await this.client.constructionParse(
            payloadsResponse.unsigned_transaction,
            false
        );

        console.log("parsing unsigned transaction", parseResponse);

        // Sign the transaction
        this.status_string = 'Signing transaction...';
        console.log("status_string", this.status_string);
        //const payload = Buffer.from(payloadsResponse.unsigned_transaction, 'hex');
        const payload = Buffer.from(payloadsResponse.unsigned_transaction, 'hex');
        const payloadbytes = new Uint8Array(payload);
        console.log(" payload length", payload.length);
        // hash the transaction

        const signatureBytes = this.senderWallet.sign(MochimoHasher.hash(payloadbytes));

        // print payload bytes lenght
        console.log("payloadbytes", payloadbytes.length);
        // convert payloadbytes to hex and
        console.log("payloadbytes", Buffer.from(payloadbytes).toString('hex'));

        // Try to verify the signature
        /*
      const computedPublicKey = this.wots.verifySignature(
          signatureBytes,
          payloadbytes,
          this.wots.sha256(this.wots_seed + 'publ'),
          this.wots.sha256(this.wots_seed + 'addr')
      );
      
    
      console.log("computedPublicKey", this.wots.bytesToHex(computedPublicKey));
      console.log("public_key", this.wots.bytesToHex(this.public_key));
    
      // say if they match
      const expectedPublicKeyPart = this.public_key.slice(0, 2144);
      if (this.wots.bytesToHex(computedPublicKey) !== this.wots.bytesToHex(expectedPublicKeyPart)) {
          console.error("Public key mismatch:");
          console.error("Computed:", this.wots.bytesToHex(computedPublicKey));
          console.error("Expected:", this.wots.bytesToHex(expectedPublicKeyPart));
          throw new Error("Signature verification failed");
      }*/

        // Combine transaction
        this.status_string = 'Combining transaction parts...';
        console.log("status_string", this.status_string);


        // Create signature with matching hex bytes
        const signature: Signature = {
            signing_payload: {
                hex_bytes: payloadsResponse.unsigned_transaction, // Must match unsigned_transaction exactly
                signature_type: "wotsp"
            },
            public_key: {
                hex_bytes: this.senderWallet.getAddressHex()!,
                curve_type: "wotsp"
            },
            signature_type: "wotsp",
            hex_bytes: Buffer.from(signatureBytes).toString('hex')
        };

        // Verify the hex bytes match before sending
        if (signature.signing_payload.hex_bytes !== payloadsResponse.unsigned_transaction) {
            throw new Error("Signing payload hex bytes must match unsigned transaction");
        }

        const combineResponse = await this.client.constructionCombine(
            payloadsResponse.unsigned_transaction,
            [signature]
        );

        // Parse signed transaction to verify
        this.status_string = 'Verifying signed transaction...';
        const parseSignedResponse = await this.client.constructionParse(
            combineResponse.signed_transaction,
            true
        );

        console.log("parseSignedResponse", parseSignedResponse);

        // Submit transaction
        this.status_string = 'Submitting transaction...';
        console.log("status_string", this.status_string);
        const submitResponse = await this.client.constructionSubmit(
            combineResponse.signed_transaction
        );

        this.status_string = 'Transaction submitted successfully';
        console.log("status_string", this.status_string);

        // print the various parts of the hex signed transaction (three public keys 2208 bytes, 3 numbers 8 bytes, a signature 2144 bytes)
        const source_address = combineResponse.signed_transaction.slice(0, 2208 * 2);
        const destination_address = combineResponse.signed_transaction.slice(2208 * 2, 2208 * 2 * 2);
        const change_address = combineResponse.signed_transaction.slice(2208 * 2 * 2, 2208 * 2 * 3);
        const amount_hex = combineResponse.signed_transaction.slice(2208 * 2 * 3, 2208 * 2 * 3 + 8 * 2);
        const change_hex = combineResponse.signed_transaction.slice(2208 * 2 * 3 + 8 * 2, 2208 * 2 * 3 + 8 * 2 * 2);
        const fee_hex = combineResponse.signed_transaction.slice(2208 * 2 * 3 + 8 * 2 * 2, 2208 * 2 * 3 + 8 * 2 * 3);
        const signature_hex = combineResponse.signed_transaction.slice(2208 * 2 * 3 + 8 * 2 * 3, 2208 * 2 * 3 + 8 * 2 * 3 + 2144 * 2);

        console.log("source_address", source_address);
        console.log("destination_address", destination_address);
        console.log("change_address", change_address);
        console.log("amount_hex", amount_hex);
        console.log("change_hex", change_hex);
        console.log("fee_hex", fee_hex);
        console.log("signature_hex", signature_hex);

        console.log("signature original", (signatureBytes));

        // print transaction unsigned payload
        console.log("unsigned_transaction", payloadsResponse.unsigned_transaction);

        return submitResponse.transaction_identifier;
    }
}

