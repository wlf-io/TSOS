import BaseApp from "./base/base";

export default class touch extends BaseApp {

    private silent: boolean = false;
    // private makeParent: boolean = false;

    protected handleFlag(flag: string): boolean {
        switch (flag.toLowerCase()) {
            case "s":
                this.silent = true;
                break;
            // case "p":
            //     this.makeParent = true;
            //     break;
        }
        return false;
    }

    public start(args: string[]): void {

        args.forEach(a => {
            try {
                this.system.fileSystem.touch(a);
            } catch (e) {
                if (!this.silent) this.output(e);
            }
        });

        this.endOutput("");
    }
}
