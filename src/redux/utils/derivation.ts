import { MasterSeed } from "@/core/MasterSeed";

export class Derivation {
    public static deriveAccountTag(masterSeed: MasterSeed, accountIndex: number): Promise<Uint8Array> {
        return masterSeed.deriveAccountTag(accountIndex);
    }
}   