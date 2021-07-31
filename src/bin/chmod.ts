import BaseApp from "./base/base";

export default class chmod extends BaseApp {

    private permSet: string | null = null;

    private permsAdd = true;
    private permTargets: ("u" | "g" | "a")[] = [];
    private perms: (0 | 1 | 2 | 4)[] = [];

    public start(args: string[]): void {
        if (args.length < 2) {
            return this.fail("useage : chmod [options] [...paths]");
        }

        try {
            this.calcPerms(args.shift() || "");

            this.setPerms(args);
        } catch (e) {
            this.fail(e);
        }
        this.end("");
    }


    private setPerms(paths: string[]) {
        paths.forEach(p => {
            const permSet: string = this.permSet || this.calcNewPerm(p);
            this.system.fileSystem.chmod(p, permSet);
        })
    }

    private calcNewPerm(path: string): string {
        const oldStr = this.system.fileSystem.getPerm(path).permString;
        const old = oldStr.split("");
        let a: number = parseInt(old.pop() || "0") || 0;
        let g: number = parseInt(old.pop() || "0") || 0;
        let u: number = parseInt(old.pop() || "0") || 0;

        if (this.permTargets.includes("a")) a = this.byteAdd(a, this.perms, this.permsAdd);
        if (this.permTargets.includes("g")) g = this.byteAdd(g, this.perms, this.permsAdd);
        if (this.permTargets.includes("u")) u = this.byteAdd(u, this.perms, this.permsAdd);

        return `0${u}${g}${a}`;
    }

    private byteAdd(perm: number, set: number[], and: boolean): number {
        set.forEach(s => {
            if (and) {
                perm = perm | s;
            } else {
                if (perm & s) perm = perm ^ s;
            }
        });
        return perm;
    }


    private calcPerms(perm: string) {
        if (/^[0-7]{3,4}$/.test(perm)) {
            this.permSet = perm;
        } else {
            const minus = perm.includes("-");
            const plus = perm.includes("+");
            const parts = perm.split(plus ? "+" : "-");
            const t: string[] = (parts[0] || "uga").split("").filter(i => i.length == 1 && /^[uga]+$/.test(i));
            const p: string[] = (parts[1] || "").split("").filter(i => i.length == 1 && /^[rwx]+$/.test(i));
            if (plus === minus || parts.length != 2 || p.length < 1) {
                throw `perm must be <uga>(+/-)[rwx] (e.g +x, u-rx, ug+rw) or 0777 octal format\n${JSON.stringify(parts)}\n${JSON.stringify(t)}\n${JSON.stringify(p)}\n${plus ? "+" : "-"}`;
            }
            // throw `not finished non octet perms\n${JSON.stringify(parts)}\n${JSON.stringify(t)}\n${JSON.stringify(p)}\n${plus ? "+" : "-"}`;
            this.permsAdd = plus;
            // @ts-ignore
            this.permTargets = t;
            const map: { [k: string]: (1 | 2 | 4) } = {
                "r": 4,
                "w": 2,
                "x": 1,
            };
            this.perms = p.map(t => map[t] || 0);
        }
    }
}
