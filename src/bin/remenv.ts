import BaseApp from "./base/base";

export default class printenv extends BaseApp {

    protected helpText =
        ` Usage: remenv [name]
 Delete the named environment variable`;

    public start(args: string[]): void {
        args.forEach(a => this.proc.parent?.system.user.remEnv(a));
        this.endOutput("");
    }
}
