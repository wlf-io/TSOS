import BaseApp from "./base/base";

export default class rm extends BaseApp {

    protected helpText =
        ` Usage: rm [option]... [path]...
 Delete files/directories.

\t-f\t\t\tforce
\t-r\t\t\tdelete recursivley`;

    private recursive: boolean = false;
    private force: boolean = false;

    protected handleFlag(flag: string, _arg: string): boolean {
        switch (flag.toLowerCase()) {
            case "f":
                this.force = true;
                break;
            case "r":
                this.recursive = true;
                break;
        }
        return false;
    }

    public start(args: string[]): void {
        args.forEach(a => this.rm(a));
        this.endOutput(this.force ? "" : "");
    }

    private rm(path: string): void {
        const fs = this.system.fileSystem;
        const fpath = fs.resolve(path);
        if (fs.exists(fpath)) {
            const dir = fs.isDir(fpath);
            if (dir) {
                if (!this.recursive) this.output(`rm: cannot remove '${fpath}': Is a Direcotry\n`);
                else {
                    const children = this.getChildren(fpath);
                    children.forEach(p => this.rm(p));
                    try {
                        fs.delete(fpath)
                    } catch (e) {
                        this.output(`rm: failed to remove '${fpath}': ${e}\n`);
                    }
                }
            } else {
                try {
                    fs.delete(fpath)
                } catch (e) {
                    this.output(`rm: failed to remove '${fpath}': ${e}\n`);
                }
            }
        }
    }

    private getChildren(path: string): string[] {
        const fs = this.system.fileSystem;
        const paths: string[] = [];
        fs.list(path, false).forEach(p => {
            paths.push(p);
        });

        return paths;
    }

}
