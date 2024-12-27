export interface AccountData {
    name: string;
    index: number;
    tag: string;  // hex tag
    wotsIndex: number;
}

export class Account {
    readonly name: string;
    readonly index: number;
    readonly tag: string;
    wotsIndex: number;

    constructor(data: AccountData) {
        this.name = data.name;
        this.index = data.index;
        this.tag = data.tag;
        this.wotsIndex = data.wotsIndex;
    }

    toJSON(): AccountData {
        return {
            name: this.name,
            index: this.index,
            tag: this.tag,
            wotsIndex: this.wotsIndex
        };
    }
} 