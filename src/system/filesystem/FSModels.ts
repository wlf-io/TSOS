import { FSPerm, iFAccess, iFileSystemPath, iUserIdent } from "../../interfaces/SystemInterfaces";
import PathResolver from "./PathResolver";

export class FSAccess implements iFAccess {
    private _owner: string;
    private _group: string;
    private perms: { [k: string]: number } = {
        user: 0,
        group: 0,
        other: 0,
    };

    public accessTime: number;
    public modifyTime: number;
    public changeTime: number;
    public createTime: number;
    public accessUndefined: boolean = false;

    constructor(perm: string, owner: string, group: string, accessTime?: number, modifyTime?: number, changeTime?: number, createTime?: number) {
        this.setPerm(perm);
        this._owner = owner;
        this._group = group;
        if (accessTime === undefined) this.accessUndefined = true;
        this.accessTime = accessTime || (Date.now() / 1000 | 0);
        this.modifyTime = modifyTime || (Date.now() / 1000 | 0);
        this.changeTime = changeTime || (Date.now() / 1000 | 0);
        this.createTime = createTime || (Date.now() / 1000 | 0);
    }

    public get permString(): string {
        return `0${this.perms.user}${this.perms.group}${this.perms.other}`;
    }

    public get longPermString(): string {
        return [
            this.permToLongString(this.perms.user),
            this.permToLongString(this.perms.group),
            this.permToLongString(this.perms.other),
        ].join("");
    }

    private permToLongString(perm: number) {
        return [
            this.permTest(perm, FSPerm.read) ? "r" : "-",
            this.permTest(perm, FSPerm.write) ? "w" : "-",
            this.permTest(perm, FSPerm.execute) ? "x" : "-",
        ].join("");
    }

    public static fromAccessString(str: string): FSAccess {
        const parts = str.split(":");
        if (parts.length > 3) {
            return new FSAccess(parts[2], parts[0], parts[1], parseInt(parts[3]) || undefined, parseInt(parts[4]) || undefined, parseInt(parts[5]) || undefined, parseInt(parts[6]) || undefined);
        } else if (parts.length == 3) {
            return new FSAccess(parts[2], parts[0], parts[1]);
        }
        throw "Invalid Access String: " + str;
    }

    // public getListArray(octet: boolean = false): string[] {
    //     return [
    //         octet ? this.permString : this.longPermString,
    //         "0",
    //         this.owner,
    //         this.group,
    //         "0"
    //     ];
    // }

    public get owner(): string {
        return this._owner;
    }

    public get group(): string {
        return this._group;
    }

    public setOwner(owner: string): void {
        this._owner = owner;
    }

    public setGroup(group: string): void {
        this._group = group;
    }

    public setPerm(perm: string) {
        if (!/^[0-7]{3,4}$/.test(perm)) throw "perm must be in 777 or 0777 format";
        this.perms.other = parseInt(perm.substr(perm.length - 1, 1));
        this.perms.group = parseInt(perm.substr(perm.length - 2, 1));
        this.perms.user = parseInt(perm.substr(perm.length - 3, 1));
    }

    public toString(): string {
        return `${this.owner}:${this.group}:${this.permString}:${this.accessTime}:${this.modifyTime}:${this.changeTime}:${this.createTime}`;
    }

    private getUserLevel(user: iUserIdent): "user" | "group" | "other" {
        if (this.owner == user.name || user.name == "root") return "user";
        if (user.groups.includes(this.group)) return "group";
        return "other";
    }

    public canRead(user: iUserIdent): boolean {
        return this.userHasPerm(user, FSPerm.read);
    }

    public canWrite(user: iUserIdent): boolean {
        return this.userHasPerm(user, FSPerm.write);
    }

    public canExecute(user: iUserIdent): boolean {
        return this.userHasPerm(user, FSPerm.execute);
    }

    private userHasPerm(user: iUserIdent, perm: FSPerm): boolean {
        switch (this.getUserLevel(user)) {
            case "user":
                if (this.permTest(this.perms.user, perm)) return true;
            case "group":
                if (this.permTest(this.perms.group, perm)) return true;
            case "other":
                if (this.permTest(this.perms.other, perm)) return true;
            default:
                return false;
        }
    }

    private permTest(perm: number, test: FSPerm): boolean {
        //@ts-ignore
        const testPerm: number = parseInt(test);
        return (perm & testPerm) > 0;
    }
}

export class FPath implements iFileSystemPath {
    private _path: string;
    private _parent: FPath | null = null;
    private cwd: string;
    private username: string;
    constructor(path: string, cwd: string, username: string) {
        this.cwd = cwd;
        this.username = username;
        this._path = PathResolver.resolve(path, cwd, username);
    }

    public get parent(): FPath {
        if (this._parent === null) {
            this._parent = new FPath(PathResolver.parent(this.path), this.cwd, this.username);
        }
        return this._parent;
    }

    public get path(): string {
        return this._path;
    }

    public get isRoot(): boolean {
        return this.path === "/";
    }

    public toString(): string {
        return this.path;
    }

    public get parentList(): FPath[] {
        if (this.isRoot) return [];
        let parent = this.parent;
        const parents = [parent];
        while (!parent.isRoot) {
            parent = parent.parent;
            parents.unshift(parent);
        }
        return parents;
    }

}
