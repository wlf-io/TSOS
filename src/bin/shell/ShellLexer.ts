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

    private isWhitespace(ch: string, nl: boolean = true): boolean {
        return ((nl ? "\n" : "") + " \r\t").indexOf(ch) >= 0;
    }
    private isAToZ0To9(ch: string): boolean {
        return /[a-zA-Z0-9]/.test(ch);
    }
    private isNotAToZ0To9(ch: string): boolean {
        return !this.isAToZ0To9(ch) && !this.isWhitespace(ch);
    }

    private isSpecial(ch: string): boolean {
        return [";", "&", ">", "|", "<", "[", "]", "=", "!"].includes(ch);
    }

    private readWhile(func: (ch: string) => boolean): string {
        let str = "";
        while (!this.stream.eof() && func(this.stream.peek())) {
            str += this.stream.next();
        }
        return str;
    }

    public all(): ShellToken[] {
        this.rewind();
        let next = this.next();
        const all: ShellToken[] = [];
        while (next != null) {
            all.push(next);
            next = this.next();
        }
        return all;
    }

    public next(): ShellToken | null {
        this.readWhile(ch => this.isWhitespace(ch));
        if (this.stream.eof()) return null;

        const ch = this.stream.peek();
        const chAfter = this.stream.peek(1);
        const line = this.stream.line + 1;
        const column = this.stream.column;

        // if (ch == "\n") {
        //     this.stream.next();
        //     return {
        //         type: TokenType.spec,
        //         value: ";",
        //         raw: ";",
        //         line,
        //         column,
        //     }
        // }
        if (ch == "#") return this.skipOneLineComment();
        if (ch == "/") {
            if (chAfter == "/") return this.skipOneLineComment();
            else if (chAfter == "*") return this.skipMultiLineComment();
        }
        this.pos++;

        if (ch == "'" || ch == '"') return this.readWrapped(ch, TokenType.string, line, column);
        if (ch == "$") return this.readVarToken(TokenType.ident, line, column);
        else if (this.isSpecial(ch)) return this.readSpecial(TokenType.spec, line, column);
        else return this.readIdentifier(TokenType.ident, line, column);

        // throw this.stream.croak("Can't handle character: " + ch);
    }

    private skipOneLineComment(): ShellToken | null {
        this.readWhile((ch: string) => ch != "\n");
        this.stream.next();
        return this.next();
    }

    private skipMultiLineComment(): ShellToken | null {
        this.readWhile((ch: string) => {
            return !(ch == "/" && this.stream.peek(-1) == "*");
        });
        this.stream.next();
        return this.next();
    }

    private readVarToken(type: TokenType, line: number, column: number): ShellToken {
        const func = this.stream.peek(1) == "{";
        let depth = 0;
        const raw = this.readEscaped((ch, n) => {
            if (func) {
                if (ch == "{") depth++;
                if (ch == "}") depth--;
                return ch == "}" && depth < 1;
            } else {
                return this.isWhitespace(n) || this.isSpecial(n);
            }
        });
        return {
            type,
            value: raw,
            raw,
            line,
            column
        };
    }

    private readWrapped(wrapper: string, type: TokenType, line: number, column: number): ShellToken {
        const raw = this.readEscaped(wrapper, true);
        return {
            type: type,
            value: raw.substring(1, raw.length - 1),
            raw: raw,
            line,
            column,
        };
    }

    private readIdentifier(type: TokenType, line: number, column: number) {
        const raw = this.readEscaped((_ch, n) => this.isWhitespace(n) || this.isSpecial(n));
        return {
            type: type,
            value: raw,
            raw: raw,
            line,
            column,
        };
    }

    private readSpecial(type: TokenType, line: number, column: number) {
        const raw = this.readWhile(ch => this.isNotAToZ0To9(ch));
        return {
            type: type,
            value: raw,
            raw: raw,
            line,
            column,
        };
    }

    private readEscaped(end: string | ((ch: string, next: string) => boolean), skipFirst: boolean = false, escape: string = "\\") {
        let escaped = skipFirst;
        let str = "";
        while (!this.stream.eof()) {
            const ch = this.stream.next();
            if (escaped) {
                str += this.resolveEscapedChar(ch);
                escaped = false;
            } else if (ch == escape && escape != "") {
                escaped = true;
            } else {
                str += ch;
                if (typeof end == "string") {
                    if (ch == end) {
                        break;
                    }
                } else {
                    if (end(ch, this.stream.peek())) {
                        break;
                    }
                }
            }
        }
        return str;
    }

    private resolveEscapedChar(char: string): string {
        switch (char) {
            case "n":
                return "\n";
            case "t":
                return "\t";
            case "$":
                return "\\$";
            case "0":
                let num = "";
                let p = this.stream.peek();
                if (/[0-7]/.test(p)) {
                    num += this.stream.next();
                }
                p = this.stream.peek();
                if (/[0-7]/.test(p)) {
                    num += this.stream.next();
                }
                const o = parseInt(num, 8);
                return decodeURIComponent("%" + o.toString(16));
            default:
                return char;
        }
    }

    public peek(count: number = 0): ShellToken | null {
        const pos: number = this.pos;
        let token: ShellToken | null = this.next();
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

export type ShellToken = {
    type: TokenType;
    value: string;
    line: number;
    column: number;
    raw: string;
}

export enum TokenType {
    string = "string",
    ident = "ident",
    spec = "spec",
}
