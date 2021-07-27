import BaseApp from "./base/base";

export default class sleep extends BaseApp {

    public start(args: string[]): void {
        setTimeout(() => {
            this.endOutput("");
        }, (parseInt(args[0]) || 1) * 1000);
    }
}
