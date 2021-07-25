import { UserIdent } from "./UserIdent";
import { FileSystemHandle, PathResolver } from "./FileSystem";
import { iProcessInstance, iProcess, iSystem, IOFeed, iOutput } from "../interfaces/SystemInterfaces";
import Display from "./Display";


export class SystemHandle implements iSystem {
    public readonly PathResolver = PathResolver;

    private _user: UserIdent;
    private fs: FileSystemHandle;

    constructor(user: UserIdent) {
        this._user = user;
        this.fs = new FileSystemHandle(this.user);
    }

    public get user(): UserIdent {
        return this._user;
    }

    public get fileSystem(): FileSystemHandle {
        return this.fs;
    }

    public createSystemHandle(name: string, pass: string | null = null): SystemHandle {
        if (name == this.user.name) return new SystemHandle(this.user);
        const root = new UserIdent("root", ["root"])
        const fs = new FileSystemHandle(root);
        const shadow = fs.read("/etc/shadow").split("\n");
        const line = (shadow.find(item => item.startsWith(name)) || "").split(":");
        if (line.length > 1) {
            if (line[1] == pass) {
                const user = new UserIdent(name, [name]);
                return new SystemHandle(user);
            }
        }
        throw "User Not found";
    }
}

export class Process implements iProcess {
    private _pid: number;
    private _system: SystemHandle;
    private _binary: iProcessInstance;
    private _parent: Process | null = null;
    private running: boolean = false;
    private _instance: iProcessInstance;

    constructor(pid: number, system: SystemHandle, binary: any, parent: Process | null = null) {
        this._pid = pid;
        this._system = system;
        this._binary = binary;
        this._parent = parent;
        //@ts-ignore
        this._instance = new this._binary(this);
    }
    kill(): void {
        this.instance.kill();
    }

    hookOut(hook: IOFeed, ident: string | null = null): void {
        this.instance.hookOut(hook, ident);
    }
    input(input: iOutput, ident: string | null = null): void {
        this.instance.input(input, ident);
    }

    public get system(): SystemHandle {
        return this._system;
    }

    public get user(): UserIdent {
        return this.system.user;
    }

    public get pid(): number {
        return this._pid;
    }

    public get instance(): iProcessInstance {
        return this._instance;
    }

    public get parent(): Process | null {
        return this._parent;
    }

    public get fileSystem(): FileSystemHandle {
        return this.system.fileSystem;
    }

    public run(args: string[]): Promise<iOutput> {
        if (this.running) throw "already running";
        this.running = true;
        return this.instance.run(args);
    }

    public createProcess(location: string): Process {
        const bin = this.fileSystem.read(location);
        const proc = System.createProcess(bin, this.system, this);
        return proc;
    }
}

export class System {
    private static processCount: number = 0;
    private static inputHooks: IOFeed[] = [];

    public static createProcess(bin: string, system: SystemHandle, creator: Process | null): Process {
        const next = eval(bin).default || null;
        System.processCount++;
        return new Process(System.processCount, system, next, creator);
    }

    public static setup(system: iSystem) {
        return fetch("/bin.json")
            .then(response => response.json())
            .then(json => {
                console.group("BIN JSON")
                Object.entries(json).forEach(e => {
                    if (typeof e[1] == "string") {
                        system.fileSystem.write("/bin/" + e[0], e[1]);
                    } else {
                        console.log(e);
                    }
                });
                console.groupEnd();
                return json;
            });
    }

    public static boot(): void {
        const root = new UserIdent("root", ["root"]);
        const rootSysHandle = new SystemHandle(root);
        document.onkeypress = ev => {
            System.keyInput(ev);
            return false;
        };
        document.onkeydown = ev => {
            switch (ev.key) {
                case "Backspace":
                case "Tab":
                    System.keyInput(ev);
                    return false;
                default:
                    console.log(ev.key);
                    break;
            }
        };
        System.setup(rootSysHandle)
            .then(() => {
                const shell = rootSysHandle.fileSystem.read("/bin/shell");
                const guest = new UserIdent("guest", ["guest"]);
                const guestSysHandle = new SystemHandle(guest);
                const proc = System.createProcess(shell, guestSysHandle, null);
                Display.hookOut(proc);
                System.hookInput(proc);
                proc.run(["--motd"]);
            });
    }

    private static hookInput(input: IOFeed): void {
        System.inputHooks.push(input);
    }

    private static keyInput(ev: KeyboardEvent): void {
        System.inputHooks.forEach(hook => hook.input(ev.key, "user"));
    }
}