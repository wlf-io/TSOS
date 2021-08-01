import BaseApp from "./base/base";

export default class mkdir extends BaseApp {
    protected helpText =
        ` Usage: mkdir [option]... [path]...
 Create directories

\t-s\t\t\tsilence, suppress errors ( does not mean it will succeed )
\t-p\t\t\tmake parent directories as required`;

    private silent: boolean = false;
    private makeParent: boolean = false;

    protected handleFlag(flag: string): boolean {
        switch (flag.toLowerCase()) {
            case "s":
                this.silent = true;
                break;
            case "p":
                this.makeParent = true;
                break;
        }
        return false;
    }

    public start(args: string[]): void {

        args.forEach(a => {
            try {
                this.system.fileSystem.mkdir(a);
            } catch (e) {
                if (!this.silent || this.makeParent) this.output(e);
            }
        });

        this.endOutput("");
    }
}
