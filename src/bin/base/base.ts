import { IOFeed, iOutput, iProcess, iProcessInstance, iSystem } from "../../interfaces/SystemInterfaces";

export default abstract class BaseApp implements iProcessInstance {

    protected proc: iProcess;
    protected system: iSystem;
    protected endPromise: { promise: Promise<iOutput>, res: (i: iOutput) => void, rej: (i: iOutput) => void };

    private outHooks: [IOFeed, string | null][] = [];

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

    protected output(out: string | string[] | string[][]) {
        this.outHooks.forEach(hook => hook[0].input(out, hook[1]));
    }

    public abstract input(input: string | string[] | string[][]): void;

    public abstract run(args: string[]): Promise<iOutput>;

}