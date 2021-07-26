import { IOFeed, iOutput, iProcess, iProcessInstance, iSystem } from "../../interfaces/SystemInterfaces";

export default abstract class BaseApp implements iProcessInstance {

    protected proc: iProcess;
    protected system: iSystem;
    protected endPromise: { promise: Promise<iOutput>, res: (i: iOutput) => void, rej: (i: iOutput) => void };

    protected helpOutput: boolean = false;

    private outHooks: [IOFeed, string | null][] = [];

    private running: boolean = false;

    protected rawArgs: string[] = [];

    constructor(proc: iProcess) {
        this.proc = proc;
        this.system = proc.system;
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

    kill(): void {
        this.endPromise.rej("kill");
    }

    hookOut(hook: IOFeed, ident: string | null = null): void {
        this.outHooks.push([hook, ident]);
    }

    protected output(out: iOutput) {
        this.outHooks.forEach(hook => hook[0].input(out, hook[1]));
    }

    public input(_input: iOutput, _ident: string): void {
        throw new Error("Method not implemented.");
    }

    public run(args: string[]): Promise<iOutput> {
        if (this.running) return Promise.reject("Already Running");
        this.running = true;
        this.rawArgs = [...args];
        args = this.processArgFlags(args);
        window.setTimeout(() => this.start(args), 1);
        return this.endPromise.promise;
    }

    protected abstract start(args: string[]): void;

    protected endOutput(output: iOutput): void {
        this.output(output);
        this.endPromise.res(output);
    }

    protected processArgFlags(args: string[]) {
        const remaining: string[] = [];
        let used: boolean = false;
        args.forEach((arg, index) => {
            if (!arg.startsWith("-")) {
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

}
