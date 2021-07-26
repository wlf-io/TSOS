import BaseApp from "./base/base";

export default class pwd extends BaseApp {

    public start(_args: string[]): void {
        this.endOutput(this.system.fileSystem.cwd);
    }
}
