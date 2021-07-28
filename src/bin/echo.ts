import BaseApp from "./base/base";

export default class echo extends BaseApp {

    private newLine: boolean = true;

    protected handleFlag(flag: string, _arg: string): boolean {
        switch (flag.toLowerCase()) {
            case "n":
                this.newLine = false;
                break;
        }
        return false;
    }

    public start(args: string[]): void {
        this.endOutput(args.join(" ") + (this.newLine ? "\n" : ""));
    }
}
