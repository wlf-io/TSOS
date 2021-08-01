import { IOFeed, iOutput, iProcess } from "../../interfaces/SystemInterfaces";
import EscapeCodes from "../../shared/EscapeCodes";
import shell from "../shell";
import ShellBlocker, { ShellBlock } from "./ShellBlocker";
// import { ShellToken } from "./ShellLexer";

export default class ShellRunner implements IOFeed {

    private tag: string = "";

    private blocker: ShellBlocker;
    private shell: shell;
    private ident: string;

    private currentProc: iProcess | null = null;

    private currentProcIdent: string = "";

    private running: boolean = false;

    public test: boolean = false;

    private block: number = 0;
    private blocks: ShellBlock[] = [];


    private funcs: { [k: string]: { block: number, endBlock: number, args: string[] } } = {};
    private funcStack: { block: number, func: string, out: string | null }[] = [];

    private scopePrefix: string;

    private queuedOutputs: iOutput[] = [];

    private currentBlock: ShellBlock | null = null;

    public mute: boolean = false;

    public perf: PerfLog;


    constructor(shell: shell, script: string, ident: string, scopePrefix: string = "", tag: string = "") {
        this.shell = shell;
        this.tag = tag || script.substr(0, 15);
        this.blocker = new ShellBlocker(script);
        this.ident = ident;
        this.scopePrefix = scopePrefix;
        this.perf = new PerfLog();
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
                if (input == EscapeCodes.CANCEL) {
                    this.running = false;
                }
                if (!(this.currentBlock?.passInput ?? false) && !this.mute) {
                    this.currentProc?.input(input, ident);
                }
                break;
            case this.currentProcIdent:
                this.output(input, ident);
                break;
            case this.currentProcIdent + "_pass":
                this.queuedOutputs.push(input);
                break;
            default:
                console.log("Shell runner lost input", input, ident);
                break;
        }
    }

    private output(output: iOutput, _ident: string | null) {
        if (this.mute) return;
        this.shell.input(output, this.ident);
    }

    // private currentBlock() {
    //     const block = new 
    // }

    public async run(): Promise<iOutput> {
        if (this.running) throw "running";
        this.perf = new PerfLog();
        this.perf.start("run");
        this.running = true;
        this.perf.start("blocking");
        this.blocks = this.blocker.getBlocks().filter(b => b.tokens.length);
        this.perf.end("blocking");
        this.block = 0;
        let args: iOutput = [];
        // if (this.shell.process.system.isDebug) console.group("Shell Runner:", this.tag);
        try {
            while (this.block < this.blocks.length) {
                if (!this.running) return "";
                const block = this.blocks[this.block].clone();
                this.currentBlock = block;
                args = await this.runBlock(block, this.block, block.passInput ? this.queuedOutputs : [], block.passOutput);
                // console.log("run");
                // console.log("Runner step out", args);
                this.block++;
            }
        } catch (e) {
            this.output(e.toString().trim() + ` : Line ${this.getBlockStartLine(this.block)}\n`, "error");
            console.log(this.blocks);
        }
        this.perf.end("run");
        if (this.shell.process.system.isDebug && this.tag.startsWith("script:")) console.log(this.tag + "\n" + this.perf.perf().join("\n"));
        // if (this.shell.process.system.isDebug) console.groupEnd();
        this.shell.process.system.debug("runner time", this.perf.total("run"));
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



    private async runBlock(block: ShellBlock, blockNumber: number, input: iOutput[], passOut: boolean): Promise<iOutput> {
        // await (new Promise(res => window.setTimeout(() => res(0), 0)));
        const tokes = block.tokens;
        if (tokes.length < 1) return "";
        if (!this.running) throw "canceled";

        const vtokes = [];
        for (const t of tokes) {
            const r = await this.shell.varReplace(t.value, this.varScopePrefix, this.getBlockStartLineNumber(blockNumber));
            vtokes.push(r);
        }

        if (this.test) {
            this.output(JSON.stringify(tokes.map(t => t.value)) + "\n", "test");
            this.output(JSON.stringify(vtokes) + "\n", "test");
            return "";
        }
        const name = vtokes.shift() || "";

        // if (name == "set") console.log("RUN", tokes.map(t => t.value), vtokes);

        this.perf.start("internal");
        const internal: any = this.handleInternal(name, vtokes, blockNumber);
        if (internal !== false) {
            this.perf.end("internal");
            return internal;

        }

        this.perf.start("createproc");
        const proc = this.shell.process.createProcess(name, vtokes);
        this.perf.end("createproc");
        this.currentProc = proc;
        this.currentProcIdent = `${name}[${proc.pid}]`;
        if (input.length) {
            console.log(JSON.stringify(input));
            while (input.length) {
                proc.input(input.shift() || "", "");
            }
        } else {
            proc.input("", "");
        }
        this.queuedOutputs = [];
        proc.hookOut(this, this.currentProcIdent + (passOut ? "_pass" : ""));
        try {
            this.perf.start("proc");
            const arg = await proc.run();
            this.perf.end("proc");
            return arg;
        } catch (e) {
            throw e;
        }
        // this.output(JSON.stringify(tokes.map(t => t.raw)) + "\n");
        // return Promise.resolve();
    }

    private handleInternal(name: string, args: string[], block: number): iOutput | false {
        name = name.trim().toLowerCase();
        if (name.startsWith(":")) return "";
        if (name == "goto") return this.goto(args[0] || "", block);
        if (name == "endif") return "";
        if (name == "if") return this.conditional(args, block);
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
        if (name == "setindex") return this.setIndex(args, block);
        if (name == "pop") return this.pop(args, block);
        if (name == "push") return this.push(args, block);
        if (name == "log") { console.log(this.getBlockStartLine(block), ...args); return ""; }
        if (name == "debug") { this.shell.process.system.debug(args[0] || "srd", args[1] || null); return ""; }
        if (name == "perfstart") { this.perf.start(args[0] || "script"); return ""; };
        if (name == "perfend") { this.perf.end(args[0] || "script"); return ""; };
        if (name == "perfout") { console.log(args[0], this.perf.getTimes(args[0]) || []); return ""; };
        if (name == "split") return this.split(args, block);
        if (name == "append") return this.append(args, block);
        if (name == "join") return this.join(args, block);
        if (name == "unique") return this.unique(args, block);
        return false;
    }


    private unique(args: string[], block: number): string {
        if (![1, 2].includes(args.length)) {
            throw `split needs 1 or 2 arguments: Line ${this.getBlockStartLine(block)}`;
        }

        let data: string = args.pop() || "[]";
        const vr: string | null = args.pop() || null;

        data = this.stringIffy(
            [...(new Set(this.arrayIffy(data)))]
        );

        if (vr) {
            return this.set([vr, data], block);
        }
        return data;
    }


    private append(args: string[], block: number): string {
        if (![2, 3].includes(args.length)) {
            throw `append needs 2 or 3 arguments: Line ${this.getBlockStartLine(block)}`;
        }

        const data2: string = args.pop() || "[]";
        const data1: string = args.pop() || "[]";
        const vr: string | null = args.pop() || null;

        const data = this.stringIffy([...this.arrayIffy(data1), ...this.arrayIffy(data2)]);

        if (vr) {
            return this.set([vr, data], block);
        }
        return data;
    }


    private split(args: string[], block: number): string {
        if (![2, 3].includes(args.length)) {
            throw `split needs 2 or 3 arguments: Line ${this.getBlockStartLine(block)}`;
        }

        const sep: string = args.pop() || ",";
        let data: string = args.pop() || "";
        const vr: string | null = args.pop() || null;

        data = this.stringIffy(data.split(sep));

        if (vr) {
            return this.set([vr, data], block);
        }
        return data;
    }

    private join(args: string[], block: number): string {
        if (![2, 3].includes(args.length)) {
            throw `join needs 2 or 3 arguments: Line ${this.getBlockStartLine(block)}`;
        }

        const sep: string = args.pop() || ",";
        let data: string = args.pop() || "";
        const vr: string | null = args.pop() || null;

        data = this.arrayIffy(data).join(sep);

        if (vr) {
            return this.set([vr, data], block);
        }
        return data;
    }

    private skipElse(block: number) {
        let depth = 1;
        const index = this.blocks.findIndex((b, i) => {
            if (i <= block) return false;
            const n = ((b.tokens[0]?.value) || "").trim().toLowerCase();
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

    private setIndex(args: string[], block: number) {
        if (![3, 4].includes(args.length)) {
            throw `setindex needs 3 or 4 arguments: Line ${this.getBlockStartLine(block)}`;
        }

        let value = args.pop() || "";
        try {
            value = JSON.parse(value);
        } catch (e) { }
        let index = parseInt(args.pop() || "") || 0;
        let str = args.pop() ?? "";
        const list = this.arrayIffy(str);
        list[index] = (typeof value == "string") ? value : JSON.stringify(value);

        str = this.stringIffy(list)

        if (args.length == 1) {
            return this.set([args[0], str], block);
        }
        return str;
    }

    private fromIndex(args: string[], block: number) {
        if (![2, 3].includes(args.length)) {
            throw `fromindex needs 2 or 3 arguments: Line ${this.getBlockStartLine(block)}`;
        }
        let index = parseInt(args.pop() || "") || 0;
        const str = args.pop() ?? "";
        const list = this.arrayIffy(str);
        if (index < 0) index += list.length;
        if (index >= list.length) index -= list.length;
        const item = list[index] || "";
        if (args.length == 1) {
            return this.set([args[0], item], block);
        }
        return item;
    }

    private pop(args: string[], block: number) {
        const arg = args[0] || "";
        let val = this.getVar(arg);
        let useVar = true;
        if (val.length < 1) {
            val = arg;
            useVar = false;
        }
        const array = this.arrayIffy(val);
        const result = array.pop() || "";
        if (useVar) {
            this.set([arg, this.stringIffy(array)], block);
        }
        return result;
    }

    private push(args: string[], block: number) {
        const arg = args[0] || "";
        let val = this.getVar(arg);
        let useVar = true;
        if (val.length < 1) {
            val = arg;
            useVar = false;
        }
        const array = this.arrayIffy(val);
        array.push(args[1] || "");
        if (useVar) {
            this.set([arg, this.stringIffy(array)], block);
        }
        return "";
    }

    private endWhile(block: number) {
        let i = block;
        let depth = 1;
        let index: number | null = null;
        while (--i >= 0) {
            const b = this.blocks[i];
            const n = ((b.tokens[0]?.value) || "").trim().toLowerCase();
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
            if (stack.out) {
                this.set([stack.out, arg || ""], block);
            }
        } else {
            this.block = this.blocks.length;
            // throw `stack error, failed to pop: Line ${this.blocks[block][0].line}\n`;
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
        this.funcStack.push({ block: block, func: name, out: args.pop() || null });
        toSet.forEach(t => this.set(t, block));
        return "";
    }

    private isFunc(name: string): boolean {
        return Object.keys(this.funcs).includes(name);
    }

    private registerFunc(args: string[], block: number) {
        if (args.length < 1) {
            throw `func must have a name: Line ${this.getBlockStartLine(block)}\n`;
        }
        const name = args.shift() || "";
        const index = this.blocks.findIndex((b, i) => {
            if (i <= block) return false;
            const n = (b.tokens[0]?.value || "").trim().toLowerCase();
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

    private printVar(): string {
        this.output([...this.shell.listVars(), []], "printvar");
        return "";
    }

    private goto(label: string, block: number) {
        const index = this.blocks.findIndex(block => {
            return (block.tokens[0]?.value || "") == `:${label}`;
        });
        if (index < 1) {
            throw `goto needs label :${label}: Line ${this.getBlockStartLine(block)}\n`;
        }
        this.block = index;
        return "";
    }

    private len(args: string[], block: number) {
        if (![1, 2].includes(args.length)) {
            throw `len can only take 1 or 2 variables: Line ${this.getBlockStartLine(block)}\n`;
        }
        if (args.length == 2) {
            return this.set([args[0], args[1].length.toString()], block);
        } else {
            return args[0].length.toString();
        }
    }

    private count(args: string[], block: number) {
        if (![1, 2].includes(args.length)) {
            throw `count can only take 1 or 2 variables: Line ${this.getBlockStartLine(block)}\n`;
        }
        if (args.length == 2) {
            return this.set([args[0], this.arrayIffy(args[1]).length.toString()], block);
        } else {
            return this.arrayIffy(args[0]).length.toString()
        }
    }

    private getVar(name: string) {
        return this.shell.getVar(name, this.varScopePrefix) || ""
    }

    private math(args: string[], func: (a: number, b: number) => number, name: string, block: number): string {
        if (![2, 3].includes(args.length)) {
            throw `${name} can only take 2 or 3 arguments: Line ${this.getBlockStartLine(block)}\n`;
        }


        let b: string | number = args.pop() || "0";
        let a: string | number = args.pop() || "0"

        a = parseFloat(a) || 0;
        b = parseFloat(b) || 0;

        const vr = args.pop() || null;

        const result = func(a, b).toString();

        if (vr !== null) {
            return this.set([vr, result], block);
        } else {
            return result;
        }
    }

    private set(args: string[], block: number): string {
        if (args.length != 2) {
            throw `set can only take 2 variables: : Line ${this.getBlockStartLine(block)}\n`;
        }
        return this.shell.setVar(args[0], args[1], this.varScopePrefix);
    }

    private conditional(args: string[], block: number, start: string = "if", end: string = "endif", endAlt: string | null = "else"): string {
        if (![1, 3, 4].includes(args.length)) {
            throw `if can only take 1 or 3 or 4 variables: Line ${this.getBlockStartLine(block)}\n`;
        }

        const len = args.length;

        const b = args.pop() || "0";
        const op = args.pop() || "";
        const a = args.pop() || "0"

        const mod = (args.pop() || "").trim().toLowerCase();

        const intA = parseInt(a) || 0;
        const intB = parseInt(b) || 0

        let pass: boolean = false;

        if (len == 1) {
            pass = intA != 0 || a.length > 0;
        } else {
            switch (op) {
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

        if (mod == "not" || mod == "!") {
            pass = !pass;
        }

        if (!pass) {
            let depth = 1;
            const index = this.blocks.findIndex((b, i) => {
                if (i <= block) return false;
                const n = (b.tokens[0]?.value || "").trim().toLowerCase();
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
            case "exec":
            case "executable":
                return this.shell.process.fileSystem.canExecute(a.trim()) && this.shell.process.fileSystem.isFile(a.trim());
            case "read":
            case "readable":
                return this.shell.process.fileSystem.canRead(a.trim());
            case "write":
            case "writeable":
                return this.shell.process.fileSystem.canWrite(a.trim());
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

    private getBlockStartLineNumber(block: number): number {
        return ((this.blocks[block]?.tokens[0]?.line) || -1);
    }

    private getBlockStartLine(block: number): string {
        return this.getBlockStartLineNumber(block).toString() + " " + JSON.stringify((this.blocks[block]?.tokens || []).map(t => t.value));
    }

    private arrayIffy(arg: string): string[] {
        const array = JSON.parse(arg);
        if (!(array instanceof Array)) throw `failed to decord array`;
        return array.map(a => (["string"].includes(typeof a)) ? a : JSON.stringify(a));
    }

    private stringIffy(arg: string[]): string {
        return JSON.stringify(
            arg.map(a => {
                try {
                    return JSON.parse(a);
                } catch {
                    return a;
                }
            })
        );
    }

}

class PerfLog {
    private data: { [k: string]: number[] } = {};

    private starts: { [k: string]: number } = {};

    public start(k: string) {
        this.starts[k] = performance.now();
    }

    public end(k: string) {
        const e = performance.now();
        if (!this.data.hasOwnProperty(k)) this.data[k] = [];
        this.data[k].push(e - (this.starts[k] || 9));
    }

    public getTimes(k: string): number[] {
        return this.data[k] || [];
    }

    public total(k: string): number {
        return this.getTimes(k).reduce((a, b) => a + b, 0);
    }

    public count(k: string): number {
        return this.getTimes(k).length;
    }

    public average(k: string) {
        return this.total(k) / this.count(k);
    }

    public perf(): string[] {
        const s = Object.keys(this.data).map(k => {
            return [
                this.padTab(k, 3),
                this.padTab(this.count(k), 3),
                this.padTab(this.total(k), 3),
                this.padTab(this.average(k), 3),
            ].join("");
        });

        s.unshift("Key\t\tcount\t\ttotal\t\taverage");
        return s;
    }

    private padTab(txt: string | number, tabs: number) {
        if (typeof txt != "string") {
            if ((txt % 1) != 0) txt = txt.toFixed(3);
            txt = txt.toString();
        }
        const c = Math.ceil(((8 * tabs) - (txt.length)) / 8);
        return txt + (new Array(c)).join("\t");
    }
}
