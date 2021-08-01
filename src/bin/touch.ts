import BaseApp from "./base/base";

export default class touch extends BaseApp {

    protected helpText =
        ` Usage: touch [option]... [path]...
 Create files

\t-s\t\t\tsilent, suppress errors ( does not mean it will succeed )`;

    private silent: boolean = false;
    // private makeParent: boolean = false;

    protected handleFlag(flag: string): boolean {
        switch (flag.toLowerCase()) {
            case "s":
                this.silent = true;
                break;
        }
        return false;
    }

    public start(args: string[]): void {

        for (const a of args) {
            try {
                this.system.fileSystem.touch(a);
            } catch (e) {
                if (!this.silent) return this.fail(e);
            }
        }

        this.endOutput("");
    }
}
