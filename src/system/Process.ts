import { iFileSystem, IOFeed, iOutput, iProcess, iProcessInstance, iSystem, iUserIdent } from "../interfaces/SystemInterfaces";

export default class Process implements iProcess {
    private _pid: number;
    private _system: iSystem;
    private _binary: iProcessInstance;
    private _parent: iProcess | null = null;
    private _instance: iProcessInstance | null;
    private args: string[];

    constructor(pid: number, system: iSystem, binary: any, args: string[], parent: iProcess | null = null) {
        this._pid = pid;
        this._system = system;
        this._binary = binary;
        this._parent = parent;
        this.args = args;
        try {
            //@ts-ignore
            this._instance = new this._binary(this);
        } catch (e) {
            this.parent?.input("\u001B[31mError\u001B[0m: Failed to start process", "error");
            this._instance = new DummyProc();
        }
    }
    kill(): void {
        this.instance?.kill();
        this._instance = null;
    }

    end(input: iOutput): void {
        this._instance?.end(input);
        this._instance = null;
    }

    hookOut(hook: IOFeed, ident: string | null = null): void {
        this.instance?.hookOut(hook, ident);
    }
    input(input: iOutput, ident: string | null = null): void {
        this.instance?.input(input, ident);
    }

    public get system(): iSystem {
        return this._system;
    }

    public get user(): iUserIdent {
        return this.system.user;
    }

    public get pid(): number {
        return this._pid;
    }

    public get instance(): iProcessInstance | null {
        return this._instance;
    }

    public get parent(): iProcess | null {
        return this._parent;
    }

    public get fileSystem(): iFileSystem {
        return this.system.fileSystem;
    }

    public run(): Promise<iOutput> {
        const out = this.instance?.run(this.args);
        return out || Promise.reject("INSTANCE FAILE");
    }

    public createProcess(location: string, args: string[]): iProcess {
        let bin: string | null = null;
        let loc: string | null = this.fileSystem.resolve(location);
        if (this.fileSystem.exists(loc)) {
            if (location.startsWith("/") || location.startsWith("./")) {
                bin = this.fileSystem.read(loc);
            }
        }
        if (bin === null) {
            loc = this.getBinPath(location);
            if (loc != null) {
                bin = this.fileSystem.read(loc);
            }
        }
        if (bin == null || loc == null) throw `${location} is not a recognized program\n`;
        if (!this.fileSystem.canExecute(loc)) throw `${loc} is not executable\n`;
        const first = bin.split("\n")[0];
        if (first.startsWith("#!")) {
            const handler = first.substr(2).trim().split(" ");
            const app = handler.shift() || "";
            if (app?.length > 0) {
                return this.createProcess(app, [...handler, "-s", loc, ...args]);
            }
        }
        const proc = this.system.createProcess(bin, args, this);
        return proc;
    }

    private getBinPath(name: string): string | null {
        const paths = this.getAvailablePrograms();
        const path = paths.find(v => v[1].includes(name)) || null;
        if (path == null) return path;
        return path[0] + "/" + name;
    }

    private getAvailablePrograms(): [string, string[]][] {
        const path = (this.user.getEnv("path") || "/bin").split(";");
        return path.map(p => [p, this.fileSystem.list(p, true)]);
    }

    public log(...args: any[]): void {
        console.log(`Proc[${this.pid}]: `, ...args);
    }
}

class DummyProc implements iProcessInstance {
    end(_input: iOutput): void {
        throw new Error("Method not implemented.");
    }
    run(_args: string[]): Promise<iOutput> {
        return Promise.resolve("");
    }
    kill(): void {
    }
    hookOut(_hook: IOFeed, _ident: string | null): void {
    }
    input(_input: iOutput, _ident: string | null): void {
    }

}
