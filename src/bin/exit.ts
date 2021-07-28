import BaseApp from "./base/base";

export default class pid extends BaseApp {

    public start(_args: string[]): void {
        this.proc.parent?.end("")
        this.endOutput("");
    }
}
