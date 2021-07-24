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
        //@ts-ignore
        const testPerm: number = parseInt(test);
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
            if (username != "root") {
                parts.unshift("home");
            }
            parts.unshift("");
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

class FPath {
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

export class FileSystemHandle implements iFileSystem {
    private _cwd: string = "/";
    private user: UserIdent;
    private fs: FileSystem;
    constructor(user: UserIdent) {
        this.user = user;
        this.fs = new FileSystem();
    }

    public write(path: string | FPath, data: string) {
        path = this.ensureFPath(path);
        // console.log(`${this.user.name} : write : ${path}`);
        this.writeCheck(path);
        this.fs.write(path, data);
    }

    public append(path: string | FPath, data: string) {
        path = this.ensureFPath(path);
        // console.log(`${this.user.name} : write : ${path}`);
        this.writeCheck(path);
        this.fs.append(path, data);
    }

    public prepend(path: string | FPath, data: string) {
        path = this.ensureFPath(path);
        // console.log(`${this.user.name} : write : ${path}`);
        this.writeCheck(path);
        this.fs.prepend(path, data);
    }

    public mkdir(path: string | FPath) {
        path = this.ensureFPath(path);
        // console.log(`${this.user.name} : mkdir : ${path}`);
        this.createCheck(path);
        this.fs.mkdir(path, this.user.name);
    }

    public touch(path: string | FPath) {
        path = this.ensureFPath(path);
        // console.log(`${this.user.name} : touch : ${path}`);
        this.createCheck(path);
        this.fs.touch(path, this.user.name);
    }

    public read(path: string | FPath): string {
        path = this.ensureFPath(path);
        // console.log(`${this.user.name} : read : ${path}`);
        this.readCheck(path);
        return this.fs.read(path);
    }

    public resolve(path: string): string {
        console.log("Resolve", path);
        const p = PathResolver.resolve(path, this.cwd, this.user.name);

        console.log("Resolve", path, p);
        return p;
    }

    private createCheck(path: FPath): void {
        if (!this.canRead(path.parent)) {
            throw `'${path.parent}' does not exist [CC]`;
        }
        if (!this.isDir(path.parent)) {
            throw `'${path.parent}' is not a directory [CC]`;
        }
        if (!this.canWrite(path.parent)) {
            throw `'${path.parent}' access denied [CC]`;
        }
        if (this.fs.exists(path)) {
            throw `${path} already exists [CC]`;
        }
    }

    private writeCheck(path: FPath): void {
        if (!this.fs.exists(path)) {
            this.touch(path);
        }
        if (!this.canWrite(path)) {
            throw `${path} access denied [WC]`;
        }
    }

    private readCheck(path: FPath): void {
        if (!this.canRead(path)) {
            throw `${path} access denied [RC]`;
        }
    }

    public canRead(path: string | FPath): boolean {
        path = this.ensureFPath(path);
        if (path.isRoot) return true;
        if (!this.exists(path)) {
            console.log("READ NOT EXIST");
            return false;
        }
        return this.fs.getPerm(path).userCanRead(this.user);
    }

    public canWrite(path: string | FPath): boolean {
        path = this.ensureFPath(path);
        if (!this.exists(path)) {
            return false
        }
        return this.fs.getPerm(path).userCanWrite(this.user);
    }

    public canExecute(path: string | FPath): boolean {
        path = this.ensureFPath(path);
        if (path.isRoot) return true;
        if (!this.exists(path)) {
            return false
        }
        return this.fs.getPerm(path).userCanExecute(this.user);
    }

    public exists(path: string | FPath): boolean {
        path = this.ensureFPath(path);
        if (!this.fs.isType(path.parent, FSType.dir)) {
            console.log("EXISTS PARENT NOT DIR");
            return false;
        }
        const perm = this.fs.getPerm(path.parent);
        if (!perm.userCanRead(this.user)) {
            console.log(`EXISTS PARENT NOT PERM ${perm}`);
            return false;
        }
        return this.fs.exists(path);
    }

    public isDir(path: string | FPath): boolean {
        path = this.ensureFPath(path);
        return this.isType(path, FSType.dir);
    }

    private ensureFPath(path: string | FPath): FPath {
        if (typeof path === "string") path = new FPath(path, this.cwd, this.user.name);
        return path;
    }

    public isFile(path: string | FPath): boolean {
        path = this.ensureFPath(path);
        return this.isType(path, FSType.file);
    }

    private isType(path: string | FPath, type: FSType): boolean {
        path = this.ensureFPath(path);
        this.readCheck(path);
        return this.fs.getType(path) == type;
    }

    public get cwd(): string {
        return this._cwd;
    }

    public setCwd(path: string | FPath): void {
        path = this.ensureFPath(path);
        if (!this.canExecute(path)) {
            throw `${path} access denied`;
        }
        if (!this.isDir(path)) {
            throw `${path} is not a directory`;
        }
        this._cwd = path.path;
        this.user.setEnv("cwd", path.path);
    }
}

class FileSystem {
    public mkdir(path: FPath, owner: string, group: string | null = null): void {
        this.setType(path, FSType.dir);
        this.setPerm(path, "755", owner, group);
    }

    public touch(path: FPath, owner: string, group: string | null = null): void {
        this.setType(path, FSType.file);
        this.setPerm(path, "644", owner, group);
        this.write(path, "");
    }

    private setType(path: FPath, type: FSType): void {
        setItem("FS:T:" + path.path, type);
    }

    public setPerm(path: FPath, perm: string, owner: string, group: string | null = null): void {
        const access = new FSAccess(perm, owner, group || owner)
        setItem("FS:P:" + path.path, access.toString());
    }

    public isType(path: FPath, type: FSType): boolean {
        return this.getType(path) == type;
    }

    public getType(path: FPath): FSType | null {
        const t: string = localStorage.getItem("FS:T:" + path.path) || "";
        return FSType[t as keyof typeof FSType] || null;
    }

    public read(path: FPath): string {
        return localStorage.getItem("FS:D:" + path.path) || "";
    }

    public write(path: FPath, data: string): void {
        setItem("FS:D:" + path.path, data);
    }

    public append(path: FPath, data: string): void {
        setItem("FS:D:" + path.path, this.read(path) + data);
    }

    public prepend(path: FPath, data: string): void {
        setItem("FS:D:" + path.path, data + this.read(path));
    }

    public exists(path: FPath): boolean {
        return this.getType(path) != null;
    }

    public getPerm(path: FPath): FSAccess {
        const str = localStorage.getItem("FS:P:" + path.path) || "";
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

(new FileSystem()).mkdir(new FPath("/", "/", "root"), "root", "root");
(new FileSystem()).mkdir(new FPath("/bin", "/", "root"), "root", "root");
(new FileSystem()).mkdir(new FPath("/home", "/", "root"), "root", "root");
(new FileSystem()).mkdir(new FPath("/home/guest", "/", "root"), "guest", "guest");
(new FileSystem()).mkdir(new FPath("/root", "/", "root"), "root", "root");
