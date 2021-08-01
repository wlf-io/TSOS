import BaseApp from "./base/base";

export default class date extends BaseApp {

    protected helpText =
        ` Usage: date [option]...
 Print current date

\t-n\t-e\t\tdo not append trailing new line`;

    private trail: string = "\n";

    handleFlag(flag: string, _arg: string) {
        switch (flag) {
            case "e":
            case "n":
                this.trail = "";
                break;
        }
        return false;
    }

    public start(_args: string[]): void {
        const date = new Date();
        this.endOutput(date.toISOString() + this.trail);
    }
}
