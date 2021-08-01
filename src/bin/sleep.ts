import BaseApp from "./base/base";

export default class sleep extends BaseApp {

    protected helpText =
        ` Usage: sleep [time]
 Pause for [time] ammount of seconds`;

    public start(args: string[]): void {
        setTimeout(() => {
            this.endOutput("");
        }, (parseFloat(args[0]) || 1) * 1000);
    }
}
