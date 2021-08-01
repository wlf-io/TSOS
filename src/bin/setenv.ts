import BaseApp from "./base/base";

export default class setenv extends BaseApp {
    protected helpText =
        ` Usage: setenv [name] [value]
 Set an environment variable`;

    public start(args: string[]): void {
        if (args.length != 2) {
            this.fail("Expected 2 arguments, [name] [value]");
        }
        this.proc.parent?.system.user.setEnv(args[0], args[1]);
        this.endOutput("");
    }
}
