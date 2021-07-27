export default class LexerStream {
    private input: string;

    private lin: number = 0;

    private pos: number = 0;

    private col: number = 0;

    constructor(input: string) {
        this.input = input;
    }

    get position(): number {
        return this.pos;
    }

    get line(): number {
        return this.lin;
    }

    get column(): number {
        return this.col;
    }

    public next(): string {
        const char = this.peek();
        this.pos++;
        if (char == "\n") {
            this.lin++;
            this.col = 0;
        } else {
            this.col++;
        }
        return char;
    }

    public peek(count: number = 0): string {
        return this.input.charAt(this.pos + count);
    }

    public eof() {
        return this.peek() == "";
    }

    public croak(error: string) {
        return new Error(`[${this.line}:${this.col}] - ${error}`);
    }

    public rewindTo(position: number) {
        this.rewind();
        while (this.pos < position) {
            this.next();
        }
    }

    public rewind() {
        this.pos = 0;
        this.lin = 0;
        this.col = 0;
    }
}