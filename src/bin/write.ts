import { iOutput } from "../interfaces/SystemInterfaces";
import BaseApp from "./base/base";

export default class write extends BaseApp {

    protected helpText =
        ` Usage: write [options]... [input] [path]
 write [input] to [file]

\t-a\t\t\tappend to file
\t-e\t-n\t\tdo not add trailing newline`;

    private append: boolean = false;
    private trail: boolean = true;

    private file: string = "";
    private lastHadNewLine: boolean = false;

    handleFlag(flag: string, _arg: string) {
        switch (flag.toLowerCase()) {
            case "a":
                this.append = true;
                break;
            case "n":
            case "e":
                this.trail = false;
                break;
        }
        return false;
    }

    protected runProcess(args: string[]) {
        super.runProcess(args);
        this.end("");
    }

    public end(output: iOutput) {
        console.log()
        if (this.trail && !this.lastHadNewLine) {
            this.write("\n", this.file);
        }
        super.end(output);
    }


    passInput(input: iOutput, _ident: string) {
        if (input instanceof Array) {
            input = input.map(i => (i instanceof Array) ? i.join("\t") : i).join("\n")
        }
        this.write(input, this.file, true);
    }

    public start(args: string[]): void {
        if (args.length > 2 || args.length < 1) {
            this.fail("usage : write <flags> <input> [filepath]")
        }

        if (args.length == 1) {
            this.file = args[0];
        } else {
            this.write(args[0], args[1]);
        }
    }


    write(txt: string, file: string, log: boolean = false) {
        if (txt.length > 0) {
            if (this.append) {
                this.system.fileSystem.append(file, txt);
            } else {
                this.system.fileSystem.write(file, txt);
            }
            if (log) this.system.debug("write", txt);
            this.append = true;
        }
        const tr = txt.replace(/ +?/g, '');
        if (txt.length > 0) {
            this.lastHadNewLine = tr.endsWith("\n");
        }
    }
}
