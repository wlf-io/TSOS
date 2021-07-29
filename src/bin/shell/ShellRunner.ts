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


    private funcs: { [k: string]: { block: number, endBlock: number, args: string[] } } = {};
    private funcStack: { block: number, func: string }[] = [];

    private scopePrefix: string;


    constructor(shell: shell, script: string, ident: string, scopePrefix: string = "") {
        this.shell = shell;
        this.blocker = new ShellBlocker(script);
        this.ident = ident;
        this.scopePrefix = scopePrefix;
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

    public async run(): Promise<iOutput> {
        if (this.running) Promise.reject("running");
        this.running = true;
        this.blocks = this.blocker.getBlocks().filter(b => b.length);
        this.block = 0;
        let args: iOutput = [];
        try {
            while (this.block < this.blocks.length) {
                // console.log("RUN BLOCK", [...this.blocks[this.block]]);
                args = await this.runBlock([...this.blocks[this.block]], this.block);
                // console.log("run");
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

    private async runBlock(tokes: ShellToken[], block: number): Promise<iOutput> {
        if (tokes.length < 1) return Promise.resolve("");
        if (!this.running) return Promise.reject("canceled");

        const vtokes = [];
        for (const t of tokes) {
            const r = await this.shell.varReplace(t.value, this.varScopePrefix);
            vtokes.push(r);
        }
        //console.log("RUN", tokes.map(t => t.value), vtokes);

        if (this.test) {
            this.output(JSON.stringify(tokes.map(t => t.value)) + "\n", "test");
            this.output(JSON.stringify(vtokes) + "\n", "test");
            return Promise.resolve("");
        }
        const name = vtokes.shift() || "";

        const internal: any = await this.handleInternal(name, vtokes, block);
        if (internal !== false) {
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

    private async handleInternal(name: string, args: string[], block: number): Promise<iOutput | false> {
        name = name.trim().toLowerCase();
        if (name.startsWith(":")) return Promise.resolve("");
        if (name == "goto") return this.goto(args[0] || "", block);
        if (name == "endif") return Promise.resolve("");
        if (name == "if") return this.conditional(args, block);
        if (name == "ifnot") return this.conditional(args, block, "ifnot", "endif", "else", true);
        if (name == "else") return this.skipElse(block);
        if (name == "set") return this.set(args, block);
        if (name == "len") return this.len(args, block);
        if (name == "count") return this.count(args, block);
        if (name == "sum") return this.math(args, (a, b) => a + b, name, block);
        if (name == "mult") return this.math(args, (a, b) => a * b, name, block);
        if (name == "div") return this.math(args, (a, b) => a / b, name, block);
        if (name == "sub") return this.math(args, (a, b) => a - b, name, block);
        if (name == "mod") return this.math(args, (a, b) => a % b, name, block);
        if (name == "pow") return this.math(args, (a, b) => a ^ b, name, block);
        if (name == "printvar") return this.printVar();
        if (name == "func") return this.registerFunc(args, block);
        if (this.isFunc(name)) return this.runFunc(name, args, block);
        if (name == "return") return this.endFunc(args[0] || "", block);
        if (name == "endfunc") return this.endFunc("", block);
        if (name == "while") return this.conditional(args, block, "while", "endwhile", null);
        if (name == "endwhile") return this.endWhile(block);
        if (name == "fromindex") return this.fromIndex(args, block);
        return Promise.resolve(false);
    }

    private async skipElse(block: number) {
        let depth = 1;
        const index = this.blocks.findIndex((b, i) => {
            if (i <= block) return false;
            const n = ((b[0]?.value) || "").trim().toLowerCase();
            if (n == "if" || n == "ifnot") depth++;
            if (n == "endif") {
                depth--;
                if (depth < 1) return true;
            }
            return false;
        });

        if (index < 0) throw `else needs endif: Line ${this.getBlockStartLine(block)}`;
        this.block = index;
        return "";
    }

    private fromIndex(args: string[], block: number) {
        if (args.length != 3) {
            throw `fromindex needs 3 arguments: Line ${this.getBlockStartLine(block)}`;
        }
        return this.set([args[0], this.arrayIffy(args[1])[parseInt(args[2]) || 0]], block);
    }

    private async endWhile(block: number) {
        let i = block;
        let depth = 1;
        let index: number | null = null;
        while (--i >= 0) {
            const b = this.blocks[i];
            const n = ((b[0]?.value) || "").trim().toLowerCase();
            if (n == "endwhile") depth++;
            if (n == "while") depth--;
            if (n == "while" && depth < 1) {
                index = i - 1;
                break;
            }
        }
        if (index == null) {
            throw `endwhile needs while above: Line ${this.getBlockStartLine(block)}`;
        } else {
            this.block = index;
        }
        return "";
    }

    public get varScopePrefix(): string {
        if (this.funcStack.length > 0) {
            const s = this.funcStack[this.funcStack.length - 1];
            return `scope_${s.func}_${this.funcStack.length}_`;
        }
        return this.scopePrefix;
    }


    private endFunc(arg: string, block: number) {
        const stack = this.funcStack.pop();
        if (stack) {
            this.block = stack.block;
        } else {
            throw `stack error, failed to pop: Line ${this.blocks[block][0].line}\n`;
        }
        return arg;
    }

    private runFunc(name: string, args: string[], block: number) {
        const func = this.funcs[name];
        const toSet: [string, string][] = [];
        func.args.forEach((a, i) => {
            toSet.push([a, args[i] || ""]);
        });
        this.block = func.block;
        this.funcStack.push({ block: block, func: name });
        toSet.forEach(t => this.set(t, block));
        return "";
    }

    private isFunc(name: string): boolean {
        return Object.keys(this.funcs).includes(name);
    }

    private async registerFunc(args: string[], block: number) {
        if (args.length < 1) {
            throw `func must have a name: Line ${this.getBlockStartLine(block)}\n`;
        }
        const name = args.shift() || "";
        const index = this.blocks.findIndex((b, i) => {
            if (i <= block) return false;
            const n = (b[0]?.value || "").trim().toLowerCase();
            if (n == "func") throw `cannot nest funcs: : Line ${this.getBlockStartLine(block)}\n`;
            return n == "endfunc";
        });
        if (index < 1) {
            throw "func needs endfunc";
        }
        this.funcs[name] = { block: block, endBlock: index, args: args };
        this.block = index;
        return "";
    }

    private async printVar(): Promise<string> {
        this.output([...this.shell.listVars(), []], "printvar");
        return "";
    }

    private async goto(label: string, block: number): Promise<string> {
        const index = this.blocks.findIndex(block => {
            return (block[0]?.value || "") == `:${label}`;
        });
        if (index < 1) {
            throw `goto needs label :${label}: Line ${this.getBlockStartLine(block)}\n`;
        }
        this.block = index;
        return "";
    }

    private async len(args: string[], block: number) {
        if (![1, 2].includes(args.length)) {
            throw `len can only take 1 or 2 variables: Line ${this.getBlockStartLine(block)}\n`;
        }
        if (args.length == 2) {
            return this.set([args[0], args[1].length.toString()], block);
        } else {
            return args[0].length.toString();
        }
    }

    private async count(args: string[], block: number) {
        if (![1, 2].includes(args.length)) {
            throw `count can only take 1 or 2 variables: Line ${this.getBlockStartLine(block)}\n`;
        }
        if (args.length == 2) {
            return this.set([args[0], this.arrayIffy(args[1]).length.toString()], block);
        } else {
            return this.arrayIffy(args[0]).length.toString()
        }
    }

    private async math(args: string[], func: (a: number, b: number) => number, name: string, block: number): Promise<string> {
        if (args.length != 2) {
            throw `${name} can only take 2 variables: Line ${this.getBlockStartLine(block)}\n`;
        }

        let a: string | number = args[0] || "0";
        let isVar: null | string = null;
        let b: string | number = args[1] || "0";


        if (isNaN(parseFloat(a))) {
            isVar = a;
            a = this.shell.getVar(a, this.varScopePrefix) || "";
        }

        a = parseInt(a) || 0;
        b = parseInt(b) || 0;
        if (isVar !== null) {
            return this.set([args[0], func(a, b).toString()], block);
        } else {
            return func(a, b).toString();
        }
    }

    private async set(args: string[], block: number): Promise<string> {
        if (args.length != 2) {
            throw `set can only take 2 variables: : Line ${this.getBlockStartLine(block)}\n`;
        }
        return this.shell.setVar(args[0], args[1], this.varScopePrefix);
    }

    private async conditional(args: string[], block: number, start: string = "if", end: string = "endif", endAlt: string | null = "else", invert: boolean = false): Promise<string> {
        if (args.length != 3 && args.length != 1) {
            throw `if can only take 1 or 3 variables: Line ${this.getBlockStartLine(block)}\n`;
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
                case "=":
                    pass = a == b;
                    break;
                case "!=":
                    pass = a == b;
                    break;
                case ">":
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
                case "%":
                    pass = (intA % intB) != 0;
                    break;
                case "is":
                    pass = this.conditionalIs(a, b, block);
                    break;
                default:
                    throw `Unrecognized operator: ${op}: Line ${this.getBlockStartLine(block)}\n`;
            }
        }

        if (invert) {
            pass = !pass;
        }

        if (!pass) {
            let depth = 1;
            const index = this.blocks.findIndex((b, i) => {
                if (i <= block) return false;
                const n = (b[0]?.value || "").trim().toLowerCase();
                if (n == start) depth++;
                if (n == end || (depth == 1 && n === endAlt)) depth--;
                return depth < 1 && (n == end || n === endAlt);
            });
            if (index < 1) {
                throw `${start} needs ${end}: Line ${this.getBlockStartLine(block)}\n`;
            }
            this.block = index;
        }

        return "";
    }

    private conditionalIs(a: string, b: string, block: number) {
        switch (b.toLowerCase()) {
            case "file":
                return this.shell.process.fileSystem.isFile(a.trim());
            case "dir":
                return this.shell.process.fileSystem.isDir(a.trim());
            case "int":
                return this.shell.process.fileSystem.isDir(a);
            case "float":
                return this.shell.process.fileSystem.isDir(a);
            default:
                throw `Invlaid is param ${b}: Line ${this.getBlockStartLine(block)}\n`;
        }
    }

    private getBlockStartLine(block: number): number {
        return (this.blocks[block][0]?.line) || -1;
    }

    private arrayIffy(arg: string): string[] {
        if (arg.includes("\n")) return arg.split("\n");
        if (arg.includes("\t")) return arg.split("\t");
        throw "array convert fail";
    }

}
