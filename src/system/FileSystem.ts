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
    private owner: string;
    private group: string;
    private perms: { [k: string]: number } = {
        user: 0,
        group: 0,
        other: 0,
    };
    constructor(perm: string, owner: string, group: string) {
        if (perm.length < 3 || perm.length > 4) throw "perm must be in 777 or 0777 format";
        this.perms.other = parseInt(perm.substr(perm.length - 1, 1));
        this.perms.group = parseInt(perm.substr(perm.length - 2, 1));
        this.perms.user = parseInt(perm.substr(perm.length - 3, 1));
        this.owner = owner;
        this.group = group;
    }

    public get permString(): string {
        return `0${this.perms.user}${this.perms.group}${this.perms.other}`;
    }

    public static fromAccessString(str: string): FSAccess {
        const parts = str.split(":");
        if (parts.length == 3) {
            return new FSAccess(parts[2], parts[0], parts[1]);
        }
        throw "Invalid Access String";
    }

    public toString(): string {
        return `${this.owner}:${this.group}:${this.permString}`;
    }

    private getUserLevel(user: UserIdent): "user" | "group" | "other" {
        if (this.owner == user.name) return "user";
        if (user.groups.includes(this.group)) return "group";
        return "other";
    }

    public userCanRead(user: UserIdent): boolean {
        return this.userHasPerm(user, FSPerm.read);
    }

    public userCanWrite(user: UserIdent): boolean {
        return this.userHasPerm(user, FSPerm.write);
    }

    public userCanExecute(user: UserIdent): boolean {
        return this.userHasPerm(user, FSPerm.execute);
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
        this.fs.mkdir(name, this.user.name);
    }

    public touch(name: string) {
        this.createCheck(name);
        this.fs.touch(name, this.user.name);
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

    public canRead(name: string): boolean {
        const fname = PathResolver.resolve(name, this.cwd, this.user.name);
        if (fname === "/") return true;
        if (!this.exists(fname)) {
            throw `${fname} does not exist`;
        }
        return this.fs.getPerm(fname).userCanRead(this.user);
    }

    public canWrite(name: string): boolean {
        const fname = PathResolver.resolve(name, this.cwd, this.user.name);
        if (!this.exists(fname)) {
            throw `${fname} does not exist`;
        }
        return this.fs.getPerm(fname).userCanWrite(this.user);
    }

    public canExecute(name: string): boolean {
        const fname = PathResolver.resolve(name, this.cwd, this.user.name);
        if (fname === "/") return true;
        if (!this.exists(fname)) {
            throw `${fname} does not exist`;
        }
        return this.fs.getPerm(fname).userCanExecute(this.user);
    }

    public exists(name: string): boolean {
        const fname = PathResolver.resolve(name, this.cwd, this.user.name);
        if (fname === "/") return true;
        const parent = PathResolver.parent(fname);
        if (parent !== "/") {
            if (!this.fs.isType(parent, FSType.dir) || !this.fs.getPerm(parent).userCanRead(this.user)) {
                return false;
            }
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
    public mkdir(name: string, owner: string, group: string | null = null): void {
        this.setType(name, FSType.dir);
        this.setPerm(name, "755", owner, group);
    }

    public touch(name: string, owner: string, group: string | null = null): void {
        this.setType(name, FSType.file);
        this.setPerm(name, "644", owner, group);
        this.write(name, "");
    }

    private setType(name: string, type: FSType): void {
        setItem("FS:T:" + name, type);
    }

    public setPerm(name: string, perm: string, owner: string, group: string | null = null): void {
        const access = new FSAccess(perm, owner, group || owner)
        setItem("FS:P:" + name, access.toString());
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

    public getPerm(name: string): FSAccess {
        const str = localStorage.getItem("FS:P:" + name) || "";
        return FSAccess.fromAccessString(str);
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

(new FileSystem()).mkdir("/", "root", "root");
