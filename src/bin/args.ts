import BaseApp from "./base/base";

export default class args extends BaseApp {
    public start(_args: string[]): void {
        this.endOutput(JSON.stringify(this.rawArgs));
    }
}
