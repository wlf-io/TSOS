import BaseApp from "./base/base";

export default class echo extends BaseApp {

    protected helpText =
        ` Usage: echo [option]... [text]...
 Echo specified text

\t-n\t-e\t\tdo not append trailing new line`;

    private newLine: boolean = true;

    protected handleFlag(flag: string, _arg: string): boolean {
        switch (flag.toLowerCase()) {
            case "n":
            case "e":
                this.newLine = false;
                break;
        }
        return false;
    }

    public start(args: string[]): void {
        this.endOutput(args.join(" ") + (this.newLine ? "\n" : ""));
    }
}
