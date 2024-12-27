export interface AccountData {
    name: string;
    index: number;
    tag: string;  // hex tag
    nextWotsIndex: number;
}

export class Account {
    readonly name: string;
    readonly index: number;
    readonly tag: string;
    nextWotsIndex: number;

    constructor(data: AccountData) {
        this.name = data.name;
        this.index = data.index;
        this.tag = data.tag;
        this.nextWotsIndex = data.nextWotsIndex;
    }

    toJSON(): AccountData {
        return {
            name: this.name,
            index: this.index,
            tag: this.tag,
            nextWotsIndex: this.nextWotsIndex
        };
    }
} 