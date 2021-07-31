import { UserIdent } from "./UserIdent";
import { FileSystem, FileSystemHandle } from "./FileSystem";
import { iProcess, iSystem, IOFeed, iFileSystem } from "../interfaces/SystemInterfaces";
import Display from "./Display";
import Process from "./Process";


export class SystemHandle implements iSystem {
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

    public debug(key: string, value: any) {
        System.debug(key, value);
    }

    public get isDebug(): boolean {
        return System.isDebug;
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

    public createProcess(bin: string, args: string[], creator: iProcess): iProcess {
        return System.createProcess(bin, this, args, creator);
    }
}

const EVAL = window.eval;
window.eval = (...args) => console.log("Eval Attempted", args);

export class System {
    private static processCount: number = 0;
    private static inputHooks: IOFeed[] = [];
    private static rootHash: string = "";


    private static debugging: boolean = false;

    private static _debug: { [k: string]: string } = {};

    public static debug(key: string, value: any): void {
        if (value == null) {
            if (System._debug.hasOwnProperty(key)) {
                delete System._debug[key];
            }
        } else {
            System._debug[key] = value;
        }
        const pre = document.getElementById("debug");
        if (pre instanceof HTMLElement) {
            pre.textContent = JSON.stringify(System._debug, null, 2);
        }
    }

    public static get isDebug(): boolean {
        return System.debugging;
    }

    private static toggleDebug() {
        System.debugging = !System.debugging;
        const pre = document.getElementById("debug");
        if (pre instanceof HTMLElement) {
            pre.style.display = System.isDebug ? "block" : "none";
        }
    }

    public static createProcess(bin: string, system: iSystem, args: string[], creator: iProcess | null): iProcess {
        let next = null;
        try {
            next = EVAL(bin).default || null;
        } catch (e) {
            throw e.toString() + "\n";
        }
        System.processCount++;
        return new Process(System.processCount, system.clone(), next, args, creator);
    }

    public static setup(system: iSystem) {
        if (System.isDev) System.toggleDebug();
        return System.loadRoot(system, () => true, true)
            .then(() => {
                if (System.isDev) {
                    window.setInterval(() => System.loadRoot(system, (s: string) => s.startsWith("/bin/")), 10000);
                }
            });
    }

    private static async loadRoot(system: iSystem, filter: ((s: string) => boolean), output: boolean = false) {
        const response = await fetch("root.json");
        const txt = await response.text();
        const hashB = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(txt));
        const hashA = Array.from(new Uint8Array(hashB));
        const hash = hashA.map(a => a.toString(16).padStart(2, "0")).join("");
        if (hash == System.rootHash) return;
        console.log("root changed", hash);
        System.rootHash = hash;
        const json = JSON.parse(txt);
        if (json == null) throw "root json is null";
        if (output) Display.instance.input("Installing...\n", "setup");
        for (const e of Object.entries(json)) {
            const path = e[0];
            if (!filter(path)) return;
            const file = e[1] || null;
            if (typeof file == "object" && file != null && file.hasOwnProperty("content")) {
                if (output) Display.instance.input(`\t${path}...`, "setup");
                const len = Math.floor(`${path}...`.length / 8);
                if (!system.fileSystem.exists(path) && !System.isDev) {
                    await (new Promise(res => window.setTimeout(() => res(0), 200)));
                }
                //@ts-ignore
                system.fileSystem.write(path, file["content"] || "");
                //@ts-ignore
                const perms = (file["perm"] || "root:root:0755").split(":");
                system.fileSystem.chmod(path, perms[2] || "755");
                system.fileSystem.chown(path, perms[0] || "root", perms[1] || "root");
                if (output) Display.instance.input(`${(new Array(5 - len)).join("\t")}\u001B[32mDone\u001B[0m\n`, "setup");
            } else {
                console.log(e);
            }
        }
        console.groupEnd();
        if (output) {
            if (!System.isDev) {
                Display.instance.input("Complete!!!", "setup");
                await (new Promise(res => window.setTimeout(() => res(0), 1000)));
            }
            Display.instance.input("\u001B[J", "setup");
        }
    }

    private static get isDev(): boolean {
        return location.hostname == "127.0.0.1";
    }

    public static async boot() {
        await FileSystem.boot();
        const root = new UserIdent("root", ["root"]);
        const rootSysHandle = new SystemHandle(root);
        document.onkeypress = ev => {
            System.keyInput(ev.key);
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
                case "Delete":
                    System.keyInput(ev.key);
                    return false;
                case "c":
                    if (ev.ctrlKey && !ev.altKey && !ev.shiftKey) {
                        System.keyInput("\u0018");
                        return false;
                    }
                case "a":
                    if (ev.ctrlKey) return false;
                    break;
                case "d":
                    if (ev.ctrlKey && ev.altKey) {
                        System.toggleDebug();
                        return false;
                    }
                case "Alt":
                case "Shift":
                case "Control":
                    break;
                default:
                    // console.log(ev);
                    break;
            }
        };
        System.setup(rootSysHandle)
            .then(() => {
                const shell = rootSysHandle.fileSystem.read("/bin/shell");
                const guest = new UserIdent("guest", ["guest"]);
                const guestSysHandle = new SystemHandle(guest);
                guestSysHandle.fileSystem.setCwd("~");
                const proc = System.createProcess(shell, guestSysHandle, ["--motd"], null);
                Display.hookOut(proc);
                System.hookInput(proc);
                return proc.run();
            })
            .then(() => {
                console.log("out")
            }).catch(_e => {
                const disp = document.getElementById("main-display");
                while (disp?.firstChild) {
                    disp.removeChild(disp.firstChild);
                }
                // location.reload();
                console.log(_e);
            });
    }

    private static hookInput(input: IOFeed): void {
        System.inputHooks.push(input);
    }

    private static keyInput(ev: string): void {
        System.inputHooks.forEach(hook => hook.input(ev, "user"));
    }
}
