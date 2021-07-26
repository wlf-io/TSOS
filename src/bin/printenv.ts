import BaseApp from "./base/base";

export default class printenv extends BaseApp {

    public start(_args: string[]): void {
        this.endOutput(
            this.system.user.getEnvEntries()
        );
    }
}
