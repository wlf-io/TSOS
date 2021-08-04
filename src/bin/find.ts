// @ts-nocheck
import BaseApp from "./base/base";

export default class find extends BaseApp {

    protected helpText =
        ` Usage: find [option]... [path]...
 Find files system entries matching flags

\t-n\t-e\t\tdo not append trailing new line`;

    private newLine: boolean = true;

    private maxDepth: number = 999;

    private name: string = "";
    private type: string = "a";
    private perm: string = "";

    private user: string = "";
    private group: string = "";

    private types: string[] = ["a", "f", "d"];

    private errors: string[] = [];

    protected handleFlag(flag: string, arg: string): boolean {
        switch (flag.toLowerCase()) {
            case "name":
            case "n":
                this.name = arg;
                return true;
            case "type":
                if (this.types.includes(arg)) {
                    this.type = arg;
                }
                return true;
            case "maxdepth":
                this.maxDepth = parseInt(arg) || 0;
                return true;
            case "perm":
                this.perm = arg;
                return true;
            case "user":
                this.user = arg;
                return true;
            case "group":
                this.group = arg;
                return true;
        }
        return false;
    }

    private loadPerm(arg: string) {

    }

    public start(args: string[]): void {
        if (this.errors.length) {
            return this.fail(this.errors.join("\n"));
        }
        this.readDir(args.shift() || ".", 1);
    }

    private readDir(path: string, depth: number) {
        if (depth > this.maxDepth) return;
        depth++;

        for (const entry of this.fs.list(path)) {

        }

    }
}
