import BaseApp from "./base/base";

export default class clear extends BaseApp {

    public start(_args: string[]): void {
        this.endOutput("\u001B[J");
    }
}
