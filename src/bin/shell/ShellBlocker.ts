import ShellLexer, { ShellToken } from "./ShellLexer";

export default class ShellBlocker {

    private lexer: ShellLexer;

    private blocks: (ShellToken[])[] = [];

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
        let currentBlock: ShellToken[] = [];
        while (!this.lexer.eof()) {
            const next = this.lexer.next();
            if (next == null) continue;
            if (next.value == ";") {
                this.blocks.push(currentBlock);
                currentBlock = [];
            } else {
                currentBlock.push(next);
            }
        }
        this.blocks.push(currentBlock);
    }

}