import { iOutput, iProcess } from "../interfaces/SystemInterfaces";
import BaseApp from "./base/base";
import ShellRunner from "./shell/ShellRunner";

export default class shell extends BaseApp {

    private motd: boolean = false;
    private inputStr: string = "";
    private _hostname: string | null = null;
    private historyIndex: number = -1;
    private column: number = 0;

    protected handleFlag(flag: string, _arg: string): boolean {
        switch (flag.toLowerCase()) {
            case "motd":
                this.motd = true;
                break;
        }
        return false;
    }

    input(input: iOutput, ident: string): void {
        if (ident == "user") {
            this.userInput(input);
        } else {
            this.output(input);
        }
    }

    public get process(): iProcess {
        return this.proc;
    }

    private userInput(input: iOutput): void {
        if (typeof input != "string") {
            throw "USER INPUT ARRAY???";
        }
        switch (input) {
            case "Enter":
                this.output("\u001B[0m");
                this.output("\n");
                if (this.inputStr.length) {
                    this.system.fileSystem.append("~/.shell_history", this.inputStr + "\n");
                    const runner = new ShellRunner(this, this.inputStr, "shell_exec");
                    runner.run()
                        .then(() => {
                            this.inputStr = "";
                            this.column = 0;
                            this.output("\n");
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

    start(args: string[]): void {
        if (this.motd) {
            this.proc.createProcess("/bin/hostname")
                .run(args)
                .then(() => {
                    this.output("\n");
                    this.prompt();
                });

        } else {
            this.prompt();
        }
    }

    private prompt(): void {
        this.getHostname()
            .catch(r => `[hostname error: ${r}]`)
            .then(host => {
                this.output([
                    "\u001B[0m",
                    "\u001B[32m",
                    `${this.system.user.name}@${host}`,
                    "\u001B[0m:\u001B[34m",
                    `${this.path}`,
                    "\u001B[0m$ ",
                ].join(""));
            });

    }

    private get path(): string {
        let path = this.system.fileSystem.cwd;
        const home = this.system.fileSystem.resolve("~");
        // console.log(home, path);
        if (path.startsWith(home)) {
            path = "~" + path.substr(home.length);
        }
        return path;
    }

    private async getHostname(): Promise<string> {
        if (this._hostname == null) {
            const host = await this.proc.createProcess("hostname")
                .run([]);
            if (typeof host == "string") {
                this._hostname = host;
            } else {
                console.log("hostname", host);
            }
        }
        return this._hostname || "";
    }

}
