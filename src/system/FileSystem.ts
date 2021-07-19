import { iFileSystem } from "../interfaces/SystemInterfaces";
import { UserIdent } from "./UserIdent";

const _setItem = Storage.prototype.setItem;

const setItem = (key: string, value: string) => {
    return _setItem.apply(window.localStorage, [key, value]);
}

Storage.prototype.setItem = (_key: string, _value: string) => {
    throw "Blocked";
};

export enum FSPerm {
    execute = 1,
    write = 2,
    read = 4,
}

export class FSAccess {
    private owner: string = "root";
    private group: string = "root";
    private perms: { [k: string]: number } = {
        user: 0,
        group: 0,
        other: 0,
    };
    constructor(perm: string) {
        if (perm.length < 3 || perm.length > 4) throw "perm must be in 777 or 0777 format";
        this.perms.other = parseInt(perm.substr(perm.length - 1, 1));
        this.perms.group = parseInt(perm.substr(perm.length - 2, 1));
        this.perms.user = parseInt(perm.substr(perm.length - 3, 1));
    }

    private getUserLevel(user: UserIdent): "user" | "group" | "other" {
        if (this.owner == user.name) return "user";
        if (user.groups.includes(this.group)) return "group";
        return "other";
    }

    public userCanRead(user: UserIdent): boolean {
        return this.userHasPerm(user, FSPerm.read);
    }

    private userHasPerm(user: UserIdent, perm: FSPerm): boolean {
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
        const testPerm: number = parseInt(FSPerm[test]);
        return (perm & testPerm) > 0;
    }
}

export class PathResolver {
    public static parent(name: string) {
        const parts = name.split("/");
        parts.pop();
        return parts.join("/");
    }

    public static resolve(name: string, cwd: string, username: string) {
        const parts = name.split("/");
        if ((parts[0] || "") == "~") {
            parts.shift();
            parts.unshift(username);
            parts.unshift("home");
        }
        if (parts[0] != "") {
            cwd.split("/").reverse().forEach(p => parts.unshift(p));
        }
        const out: string[] = [];
        parts.forEach(p => {
            if (p == ".") return;
            else if (p == "..") out.pop();
            else out.push(p);
        });
        return "/" + out.filter(i => i.length > 0).join("/");
    }
}

export class FileSystemHandle implements iFileSystem {
    private _cwd: string = "/";
    private user: UserIdent;
    private fs: FileSystem;
    constructor(user: UserIdent) {
        this.user = user;
        this.fs = new FileSystem();
    }

    public write(name: string, data: string) {
        this.writeCheck(name);
        this.fs.write(name, data);
    }

    public mkdir(name: string) {
        this.createCheck(name);
        this.fs.mkdir(name);
    }

    public touch(name: string) {
        this.createCheck(name);
        this.fs.touch(name);
    }

    public read(name: string): string {
        const fname = PathResolver.resolve(name, this.cwd, this.user.name);
        this.readCheck(fname);
        return this.fs.read(fname);
    }

    public createCheck(fname: string): void {
        const parent = PathResolver.parent(fname);
        if (!this.canRead(parent)) {
            throw `'${parent}' does not exist`;
        }
        if (!this.isDir(parent)) {
            throw `'${parent}' is not a directory`;
        }
        if (!this.canWrite(parent)) {
            throw parent + " access denied";
        }
        if (this.fs.exists(fname)) {
            throw fname + " already exists";
        }
    }

    public writeCheck(fname: string): void {
        if (!this.fs.exists(fname)) {
            throw fname + " doesn't exist";
        }
        if (!this.canWrite(fname)) {
            throw fname + " access denied";
        }
    }

    private readCheck(fname: string): void {
        if (!this.canRead(fname)) {
            throw fname + " access denied";
        }
    }

    public canRead(_name: string): boolean {
        return true;
    }

    public canWrite(name: string): boolean {
        // @ts-ignore
        const _fname = PathResolver.resolve(name, this.cwd, this.user.name);
        return true;
    }

    public exists(name: string): boolean {
        const fname = PathResolver.resolve(name, this.cwd, this.user.name);
        if (!this.canRead(fname)) {
            return false;
        }
        return this.fs.exists(fname);
    }

    public isDir(name: string): boolean {
        const fname = PathResolver.resolve(name, this.cwd, this.user.name);
        return fname == "/" || this.isType(fname, FSType.dir);
    }

    public isFile(name: string): boolean {
        const fname = PathResolver.resolve(name, this.cwd, this.user.name);
        return this.isType(fname, FSType.file);
    }

    private isType(fname: string, type: FSType): boolean {
        this.readCheck(fname);
        return this.fs.getType(fname) == type;
    }

    public get cwd(): string {
        return this._cwd;
    }
}

class FileSystem {
    public mkdir(name: string): void {
        this.setType(name, FSType.dir);
        this.setPerm(name, "755");
    }

    public touch(name: string): void {
        this.setType(name, FSType.file);
        this.setPerm(name, "644");
        this.write(name, "");
    }

    private setType(name: string, type: FSType): void {
        setItem("FS:T:" + name, type);
    }

    public setOwner(name: string, owner: string): void {
        setItem("FS:O:" + name, owner);
    }

    public setPerm(name: string, perm: string): void {
        setItem("FS:P:" + name, perm);
    }

    public isType(name: string, type: FSType): boolean {
        return this.getType(name) == type;
    }

    public getType(name: string): FSType | null {
        const t: string = localStorage.getItem("FS:T:" + name) || "";
        return FSType[t as keyof typeof FSType] || null;
    }

    public read(name: string): string {
        return localStorage.getItem("FS:D:" + name) || "";
    }

    public write(name: string, data: string): void {
        setItem("FS:D:" + name, data);
    }

    public exists(name: string): boolean {
        return this.getType(name) != null;
    }

    public getKeys(prefix: string = ""): string[] {
        return Object.keys(localStorage)
            .filter(key => key.startsWith("FS:T:"))
            .map(key => key.substr(5))
            .filter(key => key.startsWith(prefix));
    }
}

enum FSType {
    file = "file",
    dir = "dir",
    in = "in",
    out = "out",
}