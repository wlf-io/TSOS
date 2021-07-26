import { IOFeed, iOutput } from "../../interfaces/SystemInterfaces";
import shell from "../shell";
import ShellBlocker from "./ShellBlocker";
import { ShellToken } from "./ShellLexer";

export default class ShellRunner implements IOFeed {

    private blocker: ShellBlocker;
    private shell: shell;
    private ident: string;

    constructor(shell: shell, script: string, ident: string) {
        this.shell = shell;
        this.blocker = new ShellBlocker(script);
        this.ident = ident;
    }
    hookOut(_hook: IOFeed, _ident: string | null): void {
        throw new Error("Method not implemented.");
    }

    input(input: iOutput, ident: string | null): void {
        this.output(input, ident);
    }

    private output(output: iOutput, _ident: string | null) {
        this.shell.input(output, this.ident);
    }

    public run(): Promise<any> {
        const blocks = this.blocker.getBlocks();
        console.log("BLOCK RUNNER", blocks);
        return blocks.reduce(
            (p, tokes) => this.chainBlock(p, tokes)
            , Promise.resolve()
        ).catch(e => {
            this.output(e.toString(), "error")
        });
    }

    private chainBlock(promise: Promise<any>, block: ShellToken[]) {
        return promise.then(
            (...args: any[]) => this.runBlock(block, args)
        );
    }

    private runBlock(tokes: ShellToken[], _args: any[]): Promise<any> {
        if (tokes.length < 1) return Promise.resolve();
        const name = tokes.shift()?.value || "";
        const proc = this.shell.process.createProcess(name);
        proc.hookOut(this, "cmd_" + name);
        return proc.run(tokes.map(t => t.value));
        // this.output(JSON.stringify(tokes.map(t => t.raw)) + "\n");
        // return Promise.resolve();
    }

}
