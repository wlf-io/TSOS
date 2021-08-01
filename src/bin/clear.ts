import BaseApp from "./base/base";

export default class clear extends BaseApp {

    protected helpText =
        ` Usage: clear
 Clear the screen`;

    public start(_args: string[]): void {
        this.endOutput("\u001B[J");
    }
}
