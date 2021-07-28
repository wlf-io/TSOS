import BaseApp from "./base/base";

export default class chmod extends BaseApp {



    public start(_args: string[]): void {
        this.endOutput("\u001B[J");
    }
}
