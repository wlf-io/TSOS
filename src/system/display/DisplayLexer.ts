import LexerStream from "../../shared/LexerStream";

type LexToke = { s: RegExp, e: null | ((ch: string, ne: string, i: number) => boolean) };

export default class DisplayLexer {
    private input: LexerStream;

    private tokes: LexToke[] = [];

    public static createFromString(input: string, tokes: LexToke[]) {
        return new DisplayLexer(new LexerStream(input), tokes);
    }

    constructor(input: LexerStream, tokes: LexToke[]) {
        this.input = input;
        this.tokes = tokes;
    }

    public all(): string[] {
        this.rewind();
        let next = this.next();
        const all: string[] = [];
        while (next != null) {
            all.push(next);
            next = this.next();
        }
        return all;
    }

    public eof(): boolean {
        return this.input.eof();
    }

    public rewind(): void {
        this.input.rewind();
    }

    public next(): string | null {
        if (this.input.eof()) return null;
        if (this.nextIsStarter()) {
            return this.readToken();
        } else {
            return this.input.next();
        }
    }

    private nextIsStarter(): boolean {
        return this.isStarter(this.input.peek());
    }

    private isStarter(s: string): boolean {
        return this.tokes.some(t => t.s.test(s));
    }

    private readToken(): string {
        const ch = this.input.peek();
        const toke = this.tokes.find(t => t.s.test(ch)) || null;
        if (toke == null) {
            throw new Error("WAT");
        }
        const end = toke.e;
        if (end == null) {
            return this.input.next();
        } else {
            return this.readUntil(end);
        }
    }


    private readUntil(func: (current: string, next: string, index: number) => boolean): string {
        let str = "";
        let i = 0;
        while (!this.input.eof()) {
            const s = this.input.next();
            str += s;
            if (func(s, this.input.peek(), i)) break;
            i++;
        }
        return str;
    }
}
