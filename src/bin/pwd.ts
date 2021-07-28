import BaseApp from "./base/base";

export default class pwd extends BaseApp {

    private abreviate: boolean = false;

    protected handleFlag(flag: string, _arg: string): boolean {
        switch (flag.toLowerCase()) {
            case "a":
                this.abreviate = true;
                break;
        }

        return false;
    }

    public start(_args: string[]): void {
        let cwd = this.system.fileSystem.cwd;
        if (this.abreviate) {
            cwd = this.system.fileSystem.abreviate(cwd);
        }
        this.endOutput(cwd);
    }
}
