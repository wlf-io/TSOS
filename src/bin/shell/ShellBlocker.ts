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
            // if (next.line == 38) console.log(next);
            if (next.value == "" && next.raw != '""' && next.raw != "''") {
                // console.log("skipping", next);
                continue;
            }
            if (next.raw == ";") {
                this.blocks.push(currentBlock);
                currentBlock = new ShellBlock();
                continue;
            }
            if (next.type == TokenType.spec) {
                if ((next.value == ">" || next.value == ">>" || next.value == "|") && !this.isGreaterThan(next.value, currentBlock)) {
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

    private isGreaterThan(val: string, block: ShellBlock) {
        if (val != ">") return false;
        if (block.tokens.length < 2 || block.tokens.length > 3) return false;
        switch (block.tokens[0].value.trim().toLowerCase()) {
            case "if":
            case "while":
                return true;
            default:
                return false;
        }
    }

}


export class ShellBlock {
    public line: number = 0;
    public tokens: ShellToken[] = [];
    public passInput: boolean = false;
    public passOutput: boolean = false;

    constructor(...tokens: ShellToken[]) {
        this.tokens = [...tokens];
    }

    public push(token: ShellToken) {
        if (this.tokens.length < 1) this.line = token.line;
        this.tokens.push(token);
    }

    public clone() {
        const block = new ShellBlock(...this.tokens);
        block.passInput = this.passInput;
        block.passOutput = this.passOutput;
        return block;
    }
}
