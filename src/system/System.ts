import { UserIdent } from "./UserIdent";
import { FileSystemHandle, PathResolver } from "./FileSystem";
import { iProcess, iSystem, IOFeed, iFileSystem } from "../interfaces/SystemInterfaces";
import Display from "./Display";
import Process from "./Process";


export class SystemHandle implements iSystem {
    public readonly PathResolver = PathResolver;

    private _user: UserIdent;
    private fs: iFileSystem;

    constructor(user: UserIdent, fs: iFileSystem | null = null) {
        this._user = user;
        this.fs = fs || new FileSystemHandle(this.user);
    }

    public get user(): UserIdent {
        return this._user;
    }

    public get fileSystem(): iFileSystem {
        return this.fs;
    }

    public clone(): iSystem {
        const user = this.user.clone();
        const fs = this.fs.clone(user);
        return new SystemHandle(user, fs);
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

    public createProcess(bin: string, creator: iProcess): iProcess {
        return System.createProcess(bin, this, creator);
    }
}

const EVAL = window.eval;
window.eval = (...args) => console.log("Eval Attempted", args);

export class System {
    private static processCount: number = 0;
    private static inputHooks: IOFeed[] = [];

    public static createProcess(bin: string, system: iSystem, creator: iProcess | null): iProcess {
        const next = EVAL(bin).default || null;
        System.processCount++;
        return new Process(System.processCount, system.clone(), next, creator);
    }

    public static setup(system: iSystem) {
        return fetch("/bin.json")
            .then(response => response.json())
            .then(json => {
                Object.entries(json).forEach(e => {
                    const path = e[0];
                    const file = e[1] || null;
                    if (typeof file == "object" && file != null && file.hasOwnProperty("content")) {
                        //@ts-ignore
                        system.fileSystem.write(path, file["content"] || "");
                        //@ts-ignore
                        const perms = (file["perm"] || "root:root:0755").split(":");
                        system.fileSystem.chmod(path, perms[2] || "755");
                        system.fileSystem.chown(path, perms[0] || "root", perms[1] || "root");
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
                case "ArrowUp":
                case "ArrowDown":
                case "ArrowLeft":
                case "ArrowRight":
                case "Home":
                case "End":
                    System.keyInput(ev);
                    return false;
                default:
                    if (ev.key == "d") {
                        console.log(ev);
                    }
                    break;
            }
        };
        System.setup(rootSysHandle)
            .then(() => {
                const shell = rootSysHandle.fileSystem.read("/bin/shell");
                const guest = new UserIdent("guest", ["guest"]);
                const guestSysHandle = new SystemHandle(guest);
                guestSysHandle.fileSystem.setCwd("~");
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
