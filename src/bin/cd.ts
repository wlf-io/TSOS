import BaseApp from "./base/base";

export default class cd extends BaseApp {

    protected helpText =
        ` Usage: cd [path]
 Change the current directory to another`;

    public start(args: string[]): void {
        const proc = this.proc.parent;
        console.log(args);
        let dir = (args[0] == "-" ? proc?.system.user.getEnv("LAST_DIR") : args[0]) || "/";
        if (dir.length < 1) dir = "/";
        proc?.system.user.setEnv("LAST_DIR", proc?.fileSystem.cwd);
        proc?.fileSystem.setCwd(args[0] || "/");
        this.endOutput("");
    }
}
