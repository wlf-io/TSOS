import { IOFeed, iOutput, iProcess } from "../../interfaces/SystemInterfaces";
import shell from "../shell";
import ShellBlocker from "./ShellBlocker";
import { ShellToken } from "./ShellLexer";

export default class ShellRunner implements IOFeed {

    private blocker: ShellBlocker;
    private shell: shell;
    private ident: string;

    private currentProc: iProcess | null = null;

    private currentProcIdent: string = "";

    private running: boolean = false;

    public test: boolean = false;

    public out: boolean = true;

    private block: number = 0;
    private blocks: ShellToken[][] = [];

    constructor(shell: shell, script: string, ident: string) {
        this.shell = shell;
        this.blocker = new ShellBlocker(script);
        this.ident = ident;
    }

    public end() {
        this.currentProc?.input("\u0018", "user");
        this.currentProc = null;
        this.running = false;
    }

    hookOut(_hook: IOFeed, _ident: string | null): void {
        throw new Error("Method not implemented.");
    }

    input(input: iOutput, ident: string | null): void {
        switch (ident) {
            case "user":
                this.currentProc?.input(input, ident);
                break;
            case this.currentProcIdent:
                this.output(input, ident);
                break;
            default:
                console.log("Shell runner lost input", input, ident);
                break;
        }
    }

    private output(output: iOutput, _ident: string | null) {
        if (!this.out) return;
        this.shell.input(output, this.ident);
    }

    public async run(): Promise<any> {
        if (this.running) Promise.reject("running");
        this.running = true;
        this.blocks = this.blocker.getBlocks();
        this.block = 0;
        console.log("SHELL BLOCKS", this.blocks.map(b => b.map(t => t.raw)));
        let args: any[] = [];
        try {
            while (this.block < this.blocks.length) {
                args = await this.runBlock([...this.blocks[this.block]], args);
                this.block++;
            }
        } catch (e) {
            this.output(e.toString(), "error");
        }
        return Promise.resolve(args);
        // return blocks.reduce(
        //     (p, tokes) => this.chainBlock(p, tokes)
        //     , Promise.resolve()
        // ).catch(e => {
        //     this.output(e.toString(), "error")
        // });
    }

    // private chainBlock(promise: Promise<any>, block: ShellToken[]) {
    //     return promise.then(
    //         (...args: any[]) => this.runBlock(block, args)
    //     );
    // }

    private async runBlock(tokes: ShellToken[], _args: any[]): Promise<any> {
        if (tokes.length < 1) return Promise.resolve();
        if (!this.running) return Promise.reject("canceled");

        const vtokes = [];
        for (const t of tokes) {
            const r = await this.shell.varReplace(t.value);
            vtokes.push(r);
        }
        //console.log("RUN", tokes.map(t => t.value), vtokes);

        if (this.test) {
            this.output(JSON.stringify(tokes.map(t => t.value)) + "\n", "test");
            this.output(JSON.stringify(vtokes) + "\n", "test");
            return Promise.resolve();
        }
        const name = vtokes.shift() || "";

        const internal: any = await this.handleInternal(name, vtokes);
        if (internal !== null) {
            return Promise.resolve(internal);
        }

        const proc = this.shell.process.createProcess(name, vtokes);
        this.currentProc = proc;
        this.currentProcIdent = `${name}[${proc.pid}]`;
        proc.hookOut(this, this.currentProcIdent);
        return proc.run();
        // this.output(JSON.stringify(tokes.map(t => t.raw)) + "\n");
        // return Promise.resolve();
    }

    private async handleInternal(name: string, args: string[]): Promise<boolean | null> {
        if (name.startsWith(":")) return Promise.resolve(true);
        if (name == "goto") return this.goto(args[0] || "");
        if (name == "endif") return Promise.resolve(true);
        if (name == "if") return this.conditional(args);
        if (name == "set") return this.set(args);
        if (name == "sum") return this.func(args, (a, b) => a + b);
        if (name == "mult") return this.func(args, (a, b) => a * b);
        if (name == "div") return this.func(args, (a, b) => a / b);
        if (name == "sub") return this.func(args, (a, b) => a - b);
        return Promise.resolve(null);
    }

    private async goto(label: string): Promise<boolean> {
        const index = this.blocks.findIndex(block => {
            console.log("goto : ", block);
            return (block[0]?.value || "") == `:${label}`;
        });
        if (index < 1) {
            throw `goto needs label :${label}`;
        }
        this.block = index;
        return true;
    }

    private async func(args: string[], func: (a: number, b: number) => number): Promise<boolean> {
        if (args.length != 2) {
            throw "set can only take 2 variables";
        }
        const a = parseInt(this.shell.getVar(args[0])) || 0;
        const b = parseInt(args[1]) || 0;
        return this.set([args[0], func(a, b).toString()]);
    }

    private async set(args: string[]): Promise<boolean> {
        if (args.length != 2) {
            throw "set can only take 2 variables";
        }
        this.shell.setVar(args[0], args[1]);

        return true;
    }

    private async conditional(args: string[]): Promise<boolean> {
        if (args.length != 3 && args.length != 1) {
            throw "if can only take 1 or 3 variables";
        }

        const a = (args[0]).toString();
        const b = (args[2] || "0").toString();

        const intA = parseInt(a) || 0;
        const intB = parseInt(b) || 0

        let pass: boolean = false;

        if (args.length == 1) {
            pass = intA != 0 || a.length > 0;
        } else {
            const op = (args[1] || "").toString();

            switch (args[1] || "") {
                case "==":
                    pass = a == b;
                    break;
                case "!=":
                    pass = a == b;
                    break;
                case ">":
                    console.log("GREATER", intA, intB, intA > intB);
                    pass = intA > intB;
                    break;
                case ">=":
                    pass = intA >= intB;
                    break;
                case "<":
                    pass = intA < intB;
                    break;
                case "<=":
                    pass = intA <= intB;
                    break;
                default:
                    throw "Unrecognized operator: " + op;
            }
        }

        if (!pass) {
            const index = this.blocks.findIndex((block, i) => {
                return i > this.block && (block[0]?.value || "") == "endif";
            });
            if (index < 1) {
                throw "if needs endif";
            }
            this.block = index;
        }

        return true;
    }

}
