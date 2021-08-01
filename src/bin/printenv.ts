import BaseApp from "./base/base";

export default class printenv extends BaseApp {

    protected helpText =
        ` Usage: printenv
 List environment variables and their values.`;

    public start(_args: string[]): void {
        this.endOutput(
            [...this.system.user.listEnv(), []]
        );
    }
}
