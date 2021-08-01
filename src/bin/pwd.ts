import BaseApp from "./base/base";

export default class pwd extends BaseApp {

    protected helpText =
        ` Usage: pwd [option]...
 Output the current working directory

\t-a\t\t\tabbreviate the path if possible ( e.g. /home/user/file > ~/file)
\t-e\t-n\t\tdo not add trailing new line`;

    private abreviate: boolean = false;
    private trail = "\n";

    protected handleFlag(flag: string, _arg: string): boolean {
        switch (flag.toLowerCase()) {
            case "a":
                this.abreviate = true;
                break;
            case "e":
            case "n":
                this.trail = "";
                break;
        }

        return false;
    }

    public start(_args: string[]): void {
        let cwd = this.system.fileSystem.cwd;
        if (this.abreviate) {
            cwd = this.system.fileSystem.abreviate(cwd);
        }
        this.endOutput(cwd + this.trail);
    }
}
