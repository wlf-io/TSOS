import BaseApp from "./base/base";

export default class hostname extends BaseApp {

    private endChar: string = "\n";

    handleFlag(flag: string, _arg: string) {
        switch (flag) {
            case "e":
            case "n":
                this.endChar = "";
                break;
        }
        return false;
    }

    public start(_args: string[]): void {
        this.endOutput(location.hostname + this.endChar);
    }
}
