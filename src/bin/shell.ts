import { iOutput, iProcess } from "../interfaces/SystemInterfaces";
import LexerStream from "../shared/LexerStream";
import BaseApp from "./base/base";
import ShellRunner from "./shell/ShellRunner";

export default class shell extends BaseApp {

    private motd: boolean = false;
    private inputStr: string = "";
    private savedInputStr: string = "";
    // private _hostname: string | null = null;
    private historyIndex: number = -1;
    private column: number = 0;
    private script: string | null = null;
    private command: boolean = false;
    private test: boolean = false;

    private vars: { [k: string]: string } = {};

    private shellRunning: ShellRunner | null = null;

    protected handleFlag(flag: string, arg: string): boolean {
        switch (flag.toLowerCase()) {
            case "motd":
                this.motd = true;
                break;
            case "s":
            case "script":
                this.script = arg;
                return true;
            case "c":
            case "command":
                this.command = true;
                break;
            case "t":
            case "test":
                this.test = true;
                break;
        }
        return false;
    }

    protected passInput(input: iOutput, ident: string): void {
        if (ident == "user") {
            this.userInput(input, ident);
        } else {
            this.output(input);
        }
    }

    public end(output: iOutput) {
        if (this.shellRunning != null) {
            this.shellRunning.end();
            this.shellRunning = null;
            if (!this.script && !this.command) {
                return;
            }
        }
        super.end(output);
    }

    public get process(): iProcess {
        return this.proc;
    }

    private userInput(input: iOutput, ident: string): void {
        if (typeof input != "string") {
            throw "USER INPUT ARRAY???";
        }
        if (this.shellRunning != null) {
            this.shellRunning.input(input, ident);
        } else {
            switch (input) {
                case "Enter":
                    this.output("\u001B[0m");
                    this.output("\n");
                    if (this.inputStr.length) {
                        this.historyIndex = -1;
                        if (!this.inputStr.startsWith(" ")) {
                            this.system.fileSystem.append("~/.shell_history", this.inputStr + "\n");
                        }
                        this.runInput(this.inputStr)
                            .then(() => {
                                this.inputStr = "";
                                this.column = 0;
                                this.prompt();
                            });

                    } else {
                        this.prompt();
                    }
                    break;
                case "Tab":
                    console.log("TODO : auto-complete")
                    break;
                case "Backspace":
                    if (this.inputStr.length > 0) {
                        this.inputStr = this.inputStr.substring(0, this.inputStr.length - 1);
                        this.output("\b");
                    } else {
                        this.output("\u0007");
                    }
                    break;
                case "ArrowUp":
                case "ArrowDown":
                    this.history(input == "ArrowUp" ? 1 : -1);
                    break;
                case "ArrowLeft":
                case "ArrowRight":
                    this.nav(input == "ArrowLeft" ? -1 : 1);
                    break;
                case "Home":
                    break;
                case "End":
                    break;
                default:
                    this.addToInput(input);
                    break;
            }
        }
    }

    private async runInput(input: string): Promise<any> {
        const runner = new ShellRunner(this, input, "shell_exec");
        // console.log("RUN INPUT", input);
        runner.test = this.test;
        this.shellRunning = runner;
        await runner.run();
        this.clearScopedVars();
        this.shellRunning = null;
    }

    private addToInput(ch: string) {
        this.inputStr = this.inputStr.substring(0, this.column) + ch + this.inputStr.substring(this.column);
        if (this.column < this.inputStr.length - ch.length) {
            this.output("\u001B[K");
            this.output(this.inputStr.substr(this.column));
            this.output((new Array(this.inputStr.length - this.column)).join("\u001B[D"));
        } else {
            this.output(ch);
        }
        this.column += ch.length;
    }

    private history(dir: number): void {
        if (this.historyIndex < 0) {
            this.savedInputStr = this.inputStr;
        }
        this.historyIndex += dir;
        let item = "";
        if (this.historyIndex == -1) {
            item = this.savedInputStr;
        }
        if (this.historyIndex >= 0) {
            const history = this.system.fileSystem.read("~/.shell_history").trim().split("\n").filter((h, i, a) => {
                return i < 1 || a[i - 1] != h;
            });
            item = history[history.length - this.historyIndex - 1];
        }

        if (this.historyIndex < -1) this.historyIndex = -1;
        if (item.length > 0 || this.historyIndex == -1) {
            this.inputStr = "";
            this.output((new Array(this.column + 1)).join("\u001B[D"));
            this.output("\u001B[K");
            //await this.prompt();
            this.column = 0;
            if (item.length > 0) this.addToInput(item);
        }
        // 
    }

    private nav(dir: number): void {
        let dirC = "C";
        if (dir < 0) {
            if (this.column == 0) return;
            this.column--;
            dirC = "D";
            dir *= -1;
        } else {
            if (this.column == this.inputStr.length) return;
            this.column++;
        }
        this.output(`\u001B[${dir}${dirC}`);
    }

    async start(args: string[]) {
        args.forEach((v, i) => this.setVar((i).toString(), v, ""));
        this.setVar("ARGC", args.length.toString(), "");
        await this.setup();
        // console.log("START", this.script, this.command, this.motd);
        if (this.script != null) {
            const input = this.system.fileSystem.read(this.script);
            await this.runInput(input);
            this.endOutput("");
        } else if (this.command) {

        } else if (this.motd) {
            try {
                if (this.system.fileSystem.exists("/etc/shell/motd")) {
                    // console.log("MOTD");
                    await this.runInput(this.system.fileSystem.read("/etc/shell/motd"));
                }
            } catch (e) {

            }
            // console.log("MOTD PROMPT");
            this.prompt();
        } else {
            this.prompt();
        }
    }

    private async setup(): Promise<any> {
        try {
            if (this.system.fileSystem.exists("/etc/shell/profile")) {
                const test = this.test;
                this.test = false;
                await this.runInput(this.system.fileSystem.read("/etc/shell/profile"));
                // console.log("SETUP");
                this.test = test;
            }
        } catch (e) {
            console.log("Shell Setup Error", e);
        }
        return Promise.resolve();
    }

    private async prompt(): Promise<any> {
        // console.log("PROMPT", this.getVar("PS1",""), this.system.user.listEnv());
        const p = await this.varReplace(this.getVar("PS1", "") || "$USER@$HOSTNAME:$CWD\\$\\$ ");
        this.output(p);

    }

    // private get path(): string {
    //     let path = this.system.fileSystem.cwd;
    //     const home = this.system.fileSystem.resolve("~");
    //     // console.log(home, path);
    //     if (path.startsWith(home)) {
    //         path = "~" + path.substr(home.length);
    //     }
    //     return path;
    // }

    // private async getHostname(): Promise<string> {
    //     if (this._hostname == null) {
    //         const host = await this.proc.createProcess("hostname", [])
    //             .run();
    //         if (typeof host == "string") {
    //             this._hostname = host;
    //         } else {
    //             console.log("hostname", host);
    //         }
    //     }
    //     return this._hostname || "";
    // }

    public listVars(): [string, string][] {
        const vars = this.system.user.listEnv();
        const ex = vars.map(v => v[0]);
        Object.entries(this.vars).filter(v => !ex.includes(v[0]))
            .forEach(e => vars.push(e));
        return vars;
    }

    public clearScopedVars() {
        for (const k in this.vars) {
            if (k.startsWith("SCOPE_")) {
                delete this.vars[k];
            }
        }
    }

    public getVar(name: string, prefix: string): string | null {
        name = name.toUpperCase().trim();
        prefix = (prefix + name).toUpperCase().trim();
        const v = this.vars[prefix] || (this.vars[name] || this.system.user.getEnv(name));
        console.log("get var", name, prefix, v);
        return v;
    }

    public setVar(name: string, value: string, prefix: string): string {
        name = (prefix + name).toUpperCase().trim();
        console.log("set var", name, value);
        this.vars[name] = value;
        return value;
    }

    public remVar(name: string, prefix: string): void {
        name = (prefix + name).toUpperCase().trim();
        if (this.vars.hasOwnProperty(name)) {
            delete this.vars[name];
        }
    }

    public async varReplace(t: string, scopePrefix: string = ""): Promise<any> {
        const stream = new LexerStream(t);

        let o = "";

        let inVar: boolean = false;
        let escape: boolean = false;
        let varName = "";
        let varIsCmd: boolean = false;
        let varIsCmdBC: number = 0;

        while (!stream.eof()) {
            const ch = stream.next();
            if (escape) {
                escape = false;
                o += ch;
            } else if (inVar) {
                if (varIsCmd) {
                    if (ch == "}" && varIsCmdBC == 0) {
                        varIsCmd = false;
                        inVar = false;
                        if (varName.length) {
                            const runner = new ShellRunner(this, varName, "shell_exec", scopePrefix);
                            runner.out = false;
                            // console.log("VAR REPLCE RUN", varName);
                            let out = await runner.run();
                            console.log(out);
                            if (out instanceof Array && out.length) {
                                if (out[0] instanceof Array) {
                                    //@ts-ignore
                                    out = out.map(o => o.join("\t")).join("\n");
                                } else {
                                    out = out.join("\t");
                                }
                            }
                            // console.log("VAR REPLCE RUN OUR", varName, out);
                            o += out;
                        }
                    } else {
                        if (ch == "{") varIsCmdBC++;
                        if (ch == "}") varIsCmdBC--;
                        varName += ch;
                    }
                } else if (/[a-zA-Z0-9_-]/.test(ch)) {
                    varName += ch;
                } else if (varName.length < 1 && ch == "{") {
                    varIsCmd = true;
                    varIsCmdBC = 0;
                } else {
                    if (varName.length) {
                        o += this.getVar(varName, scopePrefix);
                    }
                    o += ch;
                    inVar = false;
                }
            } else if (ch == "\\") {
                escape = true;
            } else if (ch == "$") {
                inVar = true;
                varName = "";
            } else {
                o += ch
            }
        }

        if (inVar) {
            o += this.getVar(varName, scopePrefix);
        }

        return Promise.resolve(o);
    }

}
