import LexerStream from "../../shared/LexerStream";

export default class ShellLexer {

    private stream: LexerStream;
    private pos: number = -1;

    public static createFromString(input: string) {
        return new ShellLexer(new LexerStream(input));
    }

    constructor(stream: LexerStream) {
        this.stream = stream;
    }

    private isWhitespace(ch: string): boolean {
        return " \r\n\t".indexOf(ch) >= 0;
    }
    private isNotWhitespace(ch: string): boolean {
        return !this.isWhitespace(ch);;
    }

    private readWhile(func: (ch: string) => boolean): string {
        let str = "";
        while (!this.stream.eof() && func(this.stream.peek())) {
            str += this.stream.next();
        }
        return str;
    }

    public all(): Token[] {
        this.rewind();
        let next = this.next();
        const all: Token[] = [];
        while (next != null) {
            all.push(next);
            next = this.next();
        }
        return all;
    }

    public next(): Token | null {
        this.readWhile(ch => this.isWhitespace(ch));
        if (this.stream.eof()) return null;

        const ch = this.stream.peek();
        const chAfter = this.stream.peek(1);
        if (ch == "/") {
            if (chAfter == "/") this.skipOneLineComment();
            else if (chAfter == "*") this.skipMultiLineComment();
            return this.next();
        }
        this.pos++;
        const line = this.stream.line + 1;
        const column = this.stream.column;

        if (ch == "'" || ch == '"') return this.readWrapped(ch, TokenType.string, line, column);
        else return this.readNonWhitespace(TokenType.ident, line, column);

        // throw this.stream.croak("Can't handle character: " + ch);
    }

    private skipOneLineComment(): void {
        this.readWhile((ch: string) => ch != "\n");
        this.stream.next();
    }

    private skipMultiLineComment(): void {
        this.readWhile((ch: string) => {
            return !(ch == "/" && this.stream.peek(-1) == "*");
        });
        this.stream.next();
    }

    private readWrapped(wrapper: string, type: TokenType, line: number, column: number): Token {
        const raw = this.readEscaped(wrapper);
        return {
            type: type,
            value: raw.substring(1, raw.length - 1),
            raw: raw,
            line,
            column,
        };
    }

    private readNonWhitespace(type: TokenType, line: number, column: number) {
        const raw = this.readWhile(ch => this.isNotWhitespace(ch));
        return {
            type: type,
            value: raw,
            raw: raw,
            line,
            column,
        };
    }

    private readEscaped(end: string, escape: string = "\\") {
        let escaped = true;
        let str = "";
        while (!this.stream.eof()) {
            const ch = this.stream.next();
            if (escaped) {
                str += ch;
                escaped = false;
            } else if (ch == escape && escape != "") {
                escaped = true;
            } else {
                str += ch;
                if (ch == end) {
                    break;
                }
            }
        }
        return str;
    }

    public peek(count: number = 0): Token | null {
        const pos: number = this.pos;
        let token: Token | null = this.next();
        while (count--) {
            token = this.next();
        }
        this.rewindTo(pos);
        return token;
    }

    public eof() {
        return this.peek() == null;
    }

    public rewind(): void {
        this.stream.rewind();
        this.pos = -1;
    }

    public rewindTo(pos: number): void {
        this.rewind();
        while (this.pos < pos) {
            this.next();
        }
    }
}

type Token = {
    type: TokenType;
    value: string;
    line: number;
    column: number;
    raw: string;
}

export enum TokenType {
    string,
    ident,
}