import BaseApp from "./base/base";

export default class hostname extends BaseApp {

    public start(_args: string[]): void {
        this.endOutput(location.hostname);
    }
}