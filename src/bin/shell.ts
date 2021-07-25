import { iOutput } from "../interfaces/SystemInterfaces";
import BaseApp from "./base/base";
import ShellLexer from "./shell/ShellLexer";

export default class shell extends BaseApp {

    private inputStr: string = "";

    input(input: string | string[] | string[][]): void {
        switch (input) {
            case "Enter":
                this.output("\u001B[0m");
                this.output("\n");
                if (this.inputStr.length) {
                    this.output(JSON.stringify(ShellLexer.createFromString(this.inputStr).all().map(t => t.value)));
                    this.output("\n");
                    this.system.fileSystem.append("~/.shell_history", this.inputStr + "\n");
                    if (this.inputStr === "history") {
                        this.output(this.system.fileSystem.read("~/.shell_history") || "");
                    }
                }
                this.prompt();
                this.inputStr = "";
                break;
            case "Tab":
                this.inputStr += "\t";
                this.output("\t");
                break;
            case "Backspace":
                // "\ch"
                if (this.inputStr.length > 0) {
                    this.inputStr = this.inputStr.substring(0, this.inputStr.length - 1);
                    this.output("\b");
                } else {
                    this.output("\u0007");
                }
                break;
            default:
                this.inputStr += input;
                this.output(input);
                break;
        }
    }

    run(args: string[]): Promise<iOutput> {
        if ((args[0] || "") == "--motd") {
            this.output([[this.proc.pid.toString(), ...args]]);
            this.output("\n");
        }
        //console.log(this.proc.pid, args);
        // this.output([[this.proc.pid.toString(), ...args]]);
        // this.output("🎨FF0;");
        // this.output(["RAAAAAAA\nAAAA\tA\tAAAA"]);
        // this.output("1");
        // this.output("🎨F00;");
        // this.output("🎨BG-00F;");
        // this.output("2");
        // this.output("🎨reset;");
        // this.output("3");
        // this.output("4");
        // this.output("5\n");
        this.prompt();
        return this.endPromise.promise;
    }

    private prompt(): void {
        this.output([
            "\u001B[0m",
            "\u001B[32m",
            `${this.system.user.name}@${this.hostname}`,
            "\u001B[0m:\u001B[34m",
            `${this.path}`,
            "\u001B[0m$ ",
        ].join(""));
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

    private get hostname(): string {
        return "wlf.io";
    }

}