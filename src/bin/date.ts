import BaseApp from "./base/base";

export default class date extends BaseApp {

    private newline: boolean = true;

    handleFlag(flag: string, _arg: string) {
        switch (flag) {
            case "e":
            case "n":
                this.newline = false;
                break;
        }
        return false;
    }

    public start(_args: string[]): void {
        const date = new Date();
        this.endOutput(date.toISOString() + (this.newline ? "\n" : ""));
    }
}
