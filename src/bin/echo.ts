import BaseApp from "./base/base";

export default class echo extends BaseApp {

    public start(args: string[]): void {
        this.endOutput(args.join(" "));
    }
}
