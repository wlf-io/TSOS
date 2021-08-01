import BaseApp from "./base/base";

export default class mv extends BaseApp {

    protected helpText =
        ` Usage: mv [options]... [source] [destination]
 Move file from source to destionation

\t-f\t\t\tforce`;

    private force: boolean = false;

    handleFlag(flag: string, _arg: string) {
        switch (flag) {
            case "f":
                this.force = true;
                break;
        }
        return false;
    }

    public start(args: string[]): void {
        if (args.length != 2) {
            return this.fail("useage : mv <flags> [source] [destination]");
        }
        const from = args[0];
        const to = args[1];
        if (!this.system.fileSystem.isFile(from)) {
            return this.fail("can only move files for now");
        }
        this.system.fileSystem.mv(from, to, this.force);
        this.endOutput("");
    }
}
