import BaseApp from "./base/base";

export default class tail extends BaseApp {

    protected helpText =
        ` Usage: tail [option]... [path]...
 print out lines of a file starting from the end

\t-n\t\t\tnumber of lines to show ( default 5 )`;

    private lines: number = 5;

    public start(args: string[]): void {
        const out: string[] = [];
        args.forEach(a => {
            out.push(a + ":");
            out.push(this.tail(a));
            out.push("");
        });

        out.pop();

        if (out.length == 2) out.shift();

        this.endOutput(out);
    }

    private tail(path: string): string {
        try {
            const parts = this.system.fileSystem.read(path).split("\n");
            let lines = this.lines;
            if (parts[parts.length - 1] === "") {
                lines++;
            }
            return parts.slice(lines * -1).join("\n");
        } catch (e) {
            return "tail: " + e;
        }
    }
}
