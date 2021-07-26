import { iFAccess } from "../interfaces/SystemInterfaces";
import BaseApp from "./base/base";

export default class ls extends BaseApp {

    private showAll: boolean = false;
    private longForm: boolean = false;
    private humanReadable: boolean = false;
    private colour: boolean = true;

    protected handleFlag(flag: string, _arg: string): boolean {
        switch (flag.toLowerCase()) {
            case "a":
                this.showAll = true;
                break;
            case "l":
                this.longForm = true;
                break;
            case "h":
                this.humanReadable = true;
                break;
            case "c":
                this.colour = false;
                break;
        }
        return false;
    }

    public start(args: string[]): void {
        if (args.length < 1) {
            args.push(".");
        }
        const result: [string, string[][]][] = args.map(a => [a, this.list(a)]);
        if (result.length == 1) {
            this.endOutput(result[0][1]);
        } else {
            const r2: string[][] = [];
            result.forEach(r => {
                r2.push([r[0]]);
                r2.push(...r[1]);
            });
            this.endOutput(r2);
        }
    }

    private list(path: string): string[][] {
        let list: string[] | string[][] = this.system.fileSystem.list(path);
        list.sort();
        const res = this.system.fileSystem.resolve(path);
        const triml = res == "/" ? 0 : 1;
        if (res != "/") list.unshift(res + "/..");
        list.unshift(res + "/.");
        if (!this.showAll) {
            list = list.filter(l => !l.substr(res.length + 1).startsWith("."));
        }
        if (this.longForm) {
            list = list.map(l => {
                const dir = this.system.fileSystem.isDir(l);
                const perm = this.system.fileSystem.getPerm(l);
                const list = perm.getListArray(!this.humanReadable);
                const ps = (dir ? "d" : "-") + list.shift();
                return [ps, ...list, this.colouriseFile(l.substr(res.length + triml), dir, perm)]
            }
            );
        } else {
            list = [list.map(l => {
                const dir = this.system.fileSystem.isDir(l);
                const perm = this.system.fileSystem.getPerm(l);
                return this.colouriseFile(l.substr(res.length + triml), dir, perm);
            })];
        }
        return list;
    }

    private colouriseFile(name: string, dir: boolean, access: iFAccess): string {
        if (!this.colour) return name;
        if (dir) {
            name = "\u001B[34m" + name;
        } else {
            if (access.canExecute(this.system.user)) {
                name = "\u001B[32m" + name;
            }
        }
        return name + "\u001B[0m";
    }
}
