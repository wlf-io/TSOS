import BaseApp from "./base/base";

export default class exit extends BaseApp {

    public start(_args: string[]): void {
        this.proc.parent?.end("")
        this.endOutput("");
    }
}
