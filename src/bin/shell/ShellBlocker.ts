import ShellLexer, { ShellToken, TokenType } from "./ShellLexer";

export default class ShellBlocker {

    private lexer: ShellLexer;

    private blocks: ShellBlock[] = [];

    constructor(script: string) {
        this.lexer = ShellLexer.createFromString(script);
    }

    public getBlocks() {
        if (this.blocks.length < 1) {
            this.buildBlocks();
        }
        return [...this.blocks];
    }

    private buildBlocks(): void {
        this.blocks = [];
        let currentBlock: ShellBlock = new ShellBlock();
        while (!this.lexer.eof()) {
            const next = this.lexer.next();
            if (next == null) continue;
            if (next.value == ";") {
                this.blocks.push(currentBlock);
                currentBlock = new ShellBlock();
                continue;
            }
            if (next.type == TokenType.spec) {
                if (next.value == ">" || next.value == ">>" || next.value == "|") {
                    const append = next.value == ">>";
                    currentBlock.passOutput = true;
                    this.blocks.push(currentBlock);
                    currentBlock = new ShellBlock();
                    currentBlock.passInput = true;
                    if (next.value == "|") continue;
                    next.value = "write";
                    next.raw = "write";
                    currentBlock.push(next);
                    if (append) {
                        currentBlock.push({ type: TokenType.ident, raw: "-a", value: "-a", line: next.line, column: next.column });
                    }
                    continue;
                }
            }
            currentBlock.push(next);
        }
        this.blocks.push(currentBlock);
    }



}


export class ShellBlock {
    public tokens: ShellToken[] = [];
    public passInput: boolean = false;
    public passOutput: boolean = false;

    constructor(...tokens: ShellToken[]) {
        this.tokens = [...tokens];
    }

    public push(token: ShellToken) {
        this.tokens.push(token);
    }

    public clone() {
        const block = new ShellBlock(...this.tokens);
        block.passInput = this.passInput;
        block.passOutput = this.passOutput;
        return block;
    }
}
