import BaseApp from "./base/base";

export default class cd extends BaseApp {

    public start(args: string[]): void {
        this.proc.parent?.fileSystem.setCwd(args[0] || "/");
        this.endOutput("");
    }
}
