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

type RootJSON = { fs: { [k: string]: { content: string, perm: string, hash: string } }, hash: string };

export class System {
    private static processCount: number = 0;
    private static rootHash: { [k: string]: string } = {};
    private static display: IOFeed | null;


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

    public static toggleDebug() {
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

    public static loadSystemHash(system: iSystem) {
        if (system.fileSystem.isFile("/etc/version_hash")) {
            const raw = (system.fileSystem.read("/etc/version_hash") || "{}").trim();
            try {
                System.rootHash = JSON.parse(raw);
            } catch (e) {
                System.rootHash = {};
            }
            if (typeof System.rootHash !== "object" || System.rootHash == null) {
                System.rootHash = {};
            }
        }
    }

    public static setup(system: iSystem) {
        this.loadSystemHash(system);
        return System.loadRoot(system, () => true, true)
            .then(() => {
                if (System.isDev) {
                    window.setInterval(() => System.loadRoot(system, (s: string) => s.startsWith("/bin/")), 10000);
                }
            });
    }

    private static rootHashChanged(hash: string): boolean {
        const pass = System.rootHash["root"] !== hash;
        if (pass) {
            console.log("Hash Change: ", System.rootHash, "to", hash);
            System.rootHash["root"] = hash;
        }
        return pass;
    }

    private static async fetchRootJSON(): Promise<RootJSON> {
        const response = await fetch("root.json");
        return await response.json();
    }

    private static async loadRoot(system: iSystem, filter: ((s: string) => boolean), output: boolean = false) {

        const fjson = await System.fetchRootJSON();

        if (fjson == null) throw "root json is null";

        if (!System.rootHashChanged(fjson.hash || "")) return;

        const json = fjson.fs || null;
        if (json == null) throw "root fs json is null";

        if (output) System.display?.input("Installing...\n", "setup");
        for (const e of Object.entries(json)) {
            const path = e[0];
            if (!filter(path)) return;
            const file = e[1] || null;
            if (typeof file == "object" && file != null && file.hasOwnProperty("content")) {

                if (output) System.display?.input(`\t${path}...${(new Array(5 - Math.floor(`${path}...`.length / 8))).join("\t")}`, "setup");

                if (!system.fileSystem.exists(path) && !System.isDev) {
                    await (new Promise(res => window.setTimeout(() => res(0), 200)));
                }
                system.fileSystem.write(path, file["content"] || "");
                const perms = (file["perm"] || "root:root:0755").split(":");
                system.fileSystem.chmod(path, perms[2] || "755");
                system.fileSystem.chown(path, perms[0] || "root", perms[1] || "root");

                System.rootHash[path] = file.hash || "";

                if (output) System.display?.input(`\u001B[32mDone\u001B[0m\n`, "setup");
            } else {
                console.log(e);
            }
        }
        system.fileSystem.write("/etc/version_hash", `${JSON.stringify(System.rootHash)}\n`);
        if (output) {
            if (!System.isDev) {
                System.display?.input("Complete!!!", "setup");
                await (new Promise(res => window.setTimeout(() => res(0), 1000)));
            }
            System.display?.input("\u001B[J", "setup");
        }
    }

    private static get isDev(): boolean {
        return location.hostname == "127.0.0.1";
    }

    public static async boot() {
        if (System.isDev) System.toggleDebug();
        this.display = Display;
        console.group("Boot");
        await FileSystem.boot();
        const root = new UserIdent("root", ["root"]);
        const rootSysHandle = new SystemHandle(root);
        System.setup(rootSysHandle)
            .then(() => {
                console.groupEnd();
                const shell = rootSysHandle.fileSystem.read("/bin/shell");
                const guest = new UserIdent("guest", ["guest"]);
                const guestSysHandle = new SystemHandle(guest);
                guestSysHandle.fileSystem.setCwd("~");
                const proc = System.createProcess(shell, guestSysHandle, ["-p", "--motd"], null);
                System.display?.hookOut(proc, "display");
                // System.hookInput(proc);
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
}
