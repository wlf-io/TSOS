import { iFileSystem, IOFeed, iOutput, iProcess, iProcessInstance, iSystem } from "../../interfaces/SystemInterfaces";

export default abstract class BaseApp implements iProcessInstance {

    protected proc: iProcess;
    protected system: iSystem;
    private endPromise: { promise: Promise<iOutput>, res: (i: iOutput) => void, rej: (i: iOutput) => void };

    protected helpOutput: boolean = false;

    private outHooks: [IOFeed, string | null][] = [];

    private state: AppState = AppState.new;

    protected rawArgs: string[] = [];

    private inputQueue: [iOutput, string][] = [];

    protected fs: iFileSystem;

    protected helpText: string = "helptext missing";

    constructor(proc: iProcess) {
        this.proc = proc;
        this.system = proc.system;
        this.fs = proc.fileSystem;
        let res = (_i: iOutput) => { };
        let rej = (_i: iOutput) => { };
        const prom: Promise<iOutput> = new Promise((_res, _rej) => {
            res = _res;
            rej = _rej;
        });
        this.endPromise = {
            promise: prom,
            res,
            rej
        };
    }

    protected fail(reason: string): void {
        this.state = AppState.crashed;
        this.endPromise.rej(reason + "\n");
    }

    kill(): void {
        if (this.state != AppState.running) return;
        this.state = AppState.killed;
        this.endPromise.rej("");
    }

    hookOut(hook: IOFeed, ident: string | null = null): void {
        this.outHooks.push([hook, ident]);
    }

    protected output(out: iOutput) {
        if (this.state != AppState.running) return;
        this.outHooks.forEach(hook => hook[0].input(out, hook[1]));
    }

    public input(input: iOutput, ident: string): void {
        if (this.state != AppState.running) this.queueInput(input, ident);
        else if (input == "\u0018") this.end("");
        else this.passInput(input, ident);
    }

    private queueInput(input: iOutput, ident: string) {
        this.inputQueue.push([input, ident]);
    }

    protected passInput(_input: iOutput, _ident: string): void {

    }

    public run(args: string[]): Promise<iOutput> {
        if (this.state != AppState.new) return Promise.reject(this.state);
        // console.log(`Running: ${this.constructor.name}[${this.proc.pid}]`);
        this.state = AppState.running;
        this.rawArgs = [...args];
        args = this.processArgFlags(args);
        window.setTimeout(() => this.runProcess(args), 0);
        return this.endPromise.promise;
    }

    protected runProcess(args: string[]) {
        if (this.helpOutput) {
            this.outputHelp();
            return;
        }
        this.start(args);
        while (this.inputQueue.length) {
            if (this.state != AppState.running) return;
            const input = this.inputQueue.shift();
            if (input) this.input(input[0], input[1]);
        }
    }

    protected abstract start(args: string[]): void;

    protected endOutput(output: iOutput): void {
        this.output(output);
        this.end(output);
    }

    public end(output: iOutput) {
        if (this.state != AppState.running) return;
        this.state = AppState.ended;
        this.endPromise.res(output);
    }

    protected processArgFlags(args: string[]) {
        const remaining: string[] = [];
        let used: boolean = false;
        args.forEach((arg, index) => {
            if (!arg.startsWith("-") || arg.length == 1) {
                if (!used) remaining.push(arg);
                used = false;
                return;
            }
            arg = arg.substr(1);
            if (arg.startsWith("-")) {
                used = this.handleFlagIntern(arg.substr(1), args[index + 1] || "");
            } else {
                arg.split("").forEach(a => {
                    if (this.handleFlagIntern(a, args[index + 1] || "")) {
                        used = true;
                    }
                });
            }
        });
        console.log("help?", this.helpOutput);
        return remaining;
    }

    private handleFlagIntern(flag: string, arg: string): boolean {
        switch (flag.toLowerCase()) {
            case "help":
                this.helpOutput = true;
                break;
            default:
                return this.handleFlag(flag, arg);
        }
        return false;
    }

    protected handleFlag(_flag: string, _arg: string): boolean {
        return false;
    }

    private outputHelp() {
        this.endOutput(this.helpText);
    }

}

enum AppState {
    new = "new",
    running = "running",
    killed = "killed",
    ended = "ended",
    crashed = "crashed"
}
