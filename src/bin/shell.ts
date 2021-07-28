import { iOutput, iProcess } from "../interfaces/SystemInterfaces";
import LexerStream from "../shared/LexerStream";
import BaseApp from "./base/base";
import ShellRunner from "./shell/ShellRunner";

export default class shell extends BaseApp {

    private motd: boolean = false;
    private inputStr: string = "";
    // private _hostname: string | null = null;
    private historyIndex: number = -1;
    private column: number = 0;
    private script: boolean = false;
    private command: boolean = false;
    private test: boolean = false;

    private vars: { [k: string]: string } = {};

    private shellRunning: ShellRunner | null = null;

    protected handleFlag(flag: string, _arg: string): boolean {
        switch (flag.toLowerCase()) {
            case "motd":
                this.motd = true;
                break;
            case "s":
            case "script":
                this.script = true;
                break;
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
        console.log("SHELL END");
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
                        this.system.fileSystem.append("~/.shell_history", this.inputStr + "\n");
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

    private runInput(input: string): Promise<any> {
        const runner = new ShellRunner(this, input, "shell_exec");
        runner.test = this.test;
        this.shellRunning = runner;
        return runner.run()
            .then(() => {
                this.shellRunning = null;
            });
    }

    private addToInput(ch: string) {
        this.inputStr = this.inputStr.substring(0, this.column) + ch + this.inputStr.substring(this.column);
        if (this.column < this.inputStr.length - 1) {
            this.output("\u001B[K");
            this.output(this.inputStr.substr(this.column));
            console.log("REST OF LINE", this.inputStr.substr(this.column));
            this.output((new Array(this.inputStr.length - this.column)).join("\u001B[D"));
        } else {
            this.output(ch);
        }
        this.column += ch.length;
    }

    private history(dir: number): void {
        console.log("history", dir, this.historyIndex + dir);
        this.output("\u001B[K");
    }

    private nav(dir: number): void {
        console.log("nav", dir);
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
        await this.setup();
        if (this.script) {
            const scripts = args.map(a => this.system.fileSystem.read(a));
            console.log(scripts);
            await scripts.reduce((p, s) => {
                return p.then(() => {
                    return this.runInput(s);
                });
            }, Promise.resolve());
            this.endOutput("");
        } else if (this.command) {

        } else if (this.motd) {
            try {
                if (this.system.fileSystem.exists("/etc/shell/motd")) {
                    await this.runInput(this.system.fileSystem.read("/etc/shell/motd"));

                }
            } catch (e) {

            }
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
                this.test = test;
            }
        } catch (e) {
            console.log("Shell Setup Error", e);
        }
        return Promise.resolve();
    }

    private async prompt(): Promise<any> {
        const p = await this.varReplace(this.getVar("PS1"));
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

    public getVar(name: string): string {
        name = name.toLowerCase();
        let value = "";
        if (this.vars.hasOwnProperty(name)) {
            value = this.vars[name];
        } else {
            value = this.process.system.user.getEnv(name);
        }
        return value;
    }

    public setVar(name: string, value: string): void {
        name = name.toLowerCase();
        this.vars[name] = value;
    }

    public async varReplace(t: string): Promise<any> {
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
                            const runner = new ShellRunner(this, varName, "shell_exec");
                            runner.out = false;
                            const out = await runner.run();
                            o += out;
                        }
                    } else {
                        if (ch == "{") varIsCmdBC++;
                        if (ch == "}") varIsCmdBC--;
                        varName += ch;
                    }
                } else if (/[a-zA-Z_-]/.test(ch)) {
                    varName += ch;
                } else if (varName.length < 1 && ch == "{") {
                    varIsCmd = true;
                    varIsCmdBC = 0;
                } else {
                    if (varName.length) {
                        o += this.getVar(varName);
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
            o += this.getVar(varName);
        }

        return Promise.resolve(o);
    }

}
