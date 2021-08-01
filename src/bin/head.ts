import BaseApp from "./base/base";

export default class head extends BaseApp {

    protected helpText =
        ` Usage: head [option]... [path]...
 print out lines of a file starting from the beginning

\t-n\t\t\tnumber of lines to show ( default 5 )`;

    private lines: number = 5;

    public start(args: string[]): void {
        const out: string[] = [];
        args.forEach(a => {
            out.push(a + ":");
            out.push(this.head(a));
            out.push("");
        });

        out.pop();

        if (out.length == 2) this.endOutput(out[1] + "\n");
        else this.endOutput([...out, ""]);
    }

    private head(path: string): string {
        try {
            const parts = this.system.fileSystem.read(path).split("\n");
            return parts.slice(0, this.lines).join("\n");
        } catch (e) {
            return "head: " + e;
        }
    }
}
