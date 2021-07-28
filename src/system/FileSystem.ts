import { iFAccess, iFileSystem, iUserIdent } from "../interfaces/SystemInterfaces";

const _setItem = Storage.prototype.setItem;

const _cache: { [k: string]: string } = {};
let _cachePending: string[] = [];

const setItem = (key: string, value: string) => {
    _cache[key] = value;
    _cachePending.push(key);
    _cachePending = [...(new Set(_cachePending))];
    queueWrite();
}

let writeTick: number | null = null;
const queueWrite = () => {
    if (writeTick !== null) return;
    writeTick = window.setTimeout(() => {
        if (_cachePending.length > 0) {
            const key = _cachePending.shift();
            if (key) {
                _setItem.apply(window.localStorage, [key, _cache[key]]);
                // console.log(key);
            }
        }
        writeTick = null;
        if (_cachePending.length > 0) {
            queueWrite();
        }
    }, 100);
}

const _getItem = Storage.prototype.getItem;

const getItem = (key: string): string | null => {
    if (!_cache.hasOwnProperty(key)) {
        const get = _getItem.apply(window.localStorage, [key]);
        if (get != null) _cache[key] = get;
    }
    return _cache[key] || null;
}

Storage.prototype.setItem = (_key: string, _value: string) => {
    throw "Blocked";
};

export enum FSPerm {
    execute = 1,
    write = 2,
    read = 4,
}

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

    public static abreviate(path: string, cwd: string, username: string) {
        path = PathResolver.resolve(path, cwd, username);
        if (username == "root") {
            if (path.startsWith("/root/") || path == "/root") {
                path = "~" + path.substr("/root".length);
            }
        } else if (path.startsWith(`/home/${username}/`) || path == `/home/${username}`) {
            path = "~" + path.substr(`/root/${username}`.length);
        }
        return path;
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
    private user: iUserIdent;
    private fs: FileSystem;
    constructor(user: iUserIdent) {
        this.user = user;
        this.fs = new FileSystem();
    }

    public clone(user?: iUserIdent): FileSystemHandle {
        user = user || this.user.clone();
        const fs = new FileSystemHandle(user);
        fs.setCwd(this.cwd);
        return fs;
    }

    public write(path: string | FPath, data: string) {
        path = this.ensureFPath(path);
        this.writeCheck(path);
        this.fs.write(path, data);
    }

    public append(path: string | FPath, data: string) {
        path = this.ensureFPath(path);
        this.writeCheck(path);
        this.fs.append(path, data);
    }

    public prepend(path: string | FPath, data: string) {
        path = this.ensureFPath(path);
        this.writeCheck(path);
        this.fs.prepend(path, data);
    }

    public mkdir(path: string | FPath) {
        path = this.ensureFPath(path);
        this.createCheck(path);
        this.fs.mkdir(path, this.user.name);
    }

    public touch(path: string | FPath) {
        path = this.ensureFPath(path);
        this.createCheck(path);
        this.fs.touch(path, this.user.name);
    }

    public read(path: string | FPath): string {
        path = this.ensureFPath(path);
        this.readCheck(path);
        return this.fs.read(path) || "";
    }

    public delete(path: string | FPath): void {
        path = this.ensureFPath(path);
        this.writeCheck(path);
        this.fs.delete(path);
    }

    public resolve(path: string): string {
        const p = PathResolver.resolve(path, this.cwd, this.user.name);
        return p;
    }

    public abreviate(path: string | FPath): string {
        path = this.ensureFPath(path);
        return PathResolver.abreviate(path.path, this.cwd, this.user.name);
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

    private executeCheck(path: FPath): void {
        if (!this.canExecute(path)) {
            throw `${path} is not executable [EC]`;
        }
    }

    public canRead(path: string | FPath): boolean {
        path = this.ensureFPath(path);
        if (path.isRoot) return true;
        if (!this.exists(path)) {
            console.log("READ NOT EXIST");
            return false;
        }
        return this.fs.getPerm(path).canRead(this.user);
    }

    public canWrite(path: string | FPath): boolean {
        path = this.ensureFPath(path);
        if (!this.exists(path)) {
            return false
        }
        return this.fs.getPerm(path).canWrite(this.user);
    }

    public canExecute(path: string | FPath): boolean {
        path = this.ensureFPath(path);
        if (path.isRoot) return true;
        if (!this.exists(path)) {
            return false
        }
        return this.fs.getPerm(path).canExecute(this.user);
    }

    public exists(path: string | FPath): boolean {
        path = this.ensureFPath(path);
        if (!this.fs.isType(path.parent, FSType.dir)) {
            console.log("EXISTS PARENT NOT DIR");
            return false;
        }
        const perm = this.fs.getPerm(path.parent);
        if (!perm.canRead(this.user)) {
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

    public chmod(path: string | FPath, perm: string) {
        path = this.ensureFPath(path);
        this.writeCheck(path);
        const access = this.fs.getPerm(path);
        access.setPerm(perm);
        this.fs.setPerm(path, access);
    }

    public chown(path: string | FPath, owner: string, group?: string) {
        path = this.ensureFPath(path);
        this.writeCheck(path);
        const access = this.fs.getPerm(path);
        access.setOwner(owner);
        access.setGroup(group || access.group);
        this.fs.setPerm(path, access);
    }

    public list(path: string | FPath, trim: boolean = false): string[] {
        const fpath = this.ensureFPath(path);
        this.executeCheck(fpath);
        let items = this.fs.list(fpath);
        items = items.filter(i => this.canRead(i));
        if (trim) {
            items = items.map(key => trim ? key.substr(fpath.path.length + (fpath.path == "/" ? 0 : 1)) : key)
        }
        return items;
    }

    public getPerm(path: string | FPath): iFAccess {
        path = this.ensureFPath(path);
        this.readCheck(path);
        return this.fs.getPerm(path);
    }
}

class FileSystem {
    public mkdir(path: FPath, owner: string, group: string | null = null): void {
        this.setType(path, FSType.dir);
        this.setPerm(path, new FSAccess("755", owner, group || owner));
    }

    public touch(path: FPath, owner: string, group: string | null = null): void {
        this.setType(path, FSType.file);
        this.setPerm(path, new FSAccess("644", owner, group || owner));
        this.write(path, "");
    }

    private setType(path: FPath, type: FSType): void {
        setItem("FS:T:" + path.path, type);
    }

    public setPerm(path: FPath, perm: FSAccess): void {
        setItem("FS:P:" + path.path, perm.toString());
    }

    public isType(path: FPath, type: FSType): boolean {
        return this.getType(path) == type;
    }

    public getType(path: FPath): FSType | null {
        const t: string = getItem("FS:T:" + path.path) || "";
        return FSType[t as keyof typeof FSType] || null;
    }

    public read(path: FPath): string | null {
        const res = getItem("FS:D:" + path.path);
        if (res != null) {
            const perm = this.getPerm(path);
            perm.accessTime = (Date.now() / 1000 | 0);
            this.setPerm(path, perm);
        }
        return res;
    }

    public write(path: FPath, data: string): void {
        setItem("FS:D:" + path.path, data);
        const perm = this.getPerm(path);
        perm.modifyTime = (Date.now() / 1000 | 0);
        this.setPerm(path, perm);
    }

    public delete(path: FPath): void {
        const t = this.getType(path);
        if (t !== null) {
            setItem(`!FS:T:${path.path}`, t);
            localStorage.removeItem(`FS:T:${path.path}`);
            if (t == FSType.file) {
                setItem(`!FS:D:${path.path}`, this.read(path) || "");
                localStorage.removeItem(`FS:D:${path.path}`);
            }
            setItem(`!FS:P:${path.path}`, this.getPerm(path).toString());
            localStorage.removeItem(`FS:P:${path.path}`);
        }
    }

    public append(path: FPath, data: string): void {
        this.write(path, this.read(path) + data);
    }

    public prepend(path: FPath, data: string): void {
        this.write(path, data + this.read(path));
    }

    public exists(path: FPath): boolean {
        return this.getType(path) != null;
    }

    public getPerm(path: FPath): FSAccess {
        const str = getItem("FS:P:" + path.path) || "";
        const perm = FSAccess.fromAccessString(str);
        if (perm.accessUndefined) {
            this.setPerm(path, perm);
        }
        return perm;
    }

    public list(path: FPath, deleted: boolean = false): string[] {
        return Object.keys(localStorage)
            .filter(key => key.startsWith("FS:T:") || (deleted ? key.startsWith("!FS:T:") : false))
            .map(key => key.substr(5))
            .filter(key => key.startsWith(path.path + (path.path == "/" ? "" : "/")) && key.length > path.path.length)
            .filter(key => !key.substr(path.path.length + (path.path == "/" ? 0 : 1)).includes("/"));
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
(new FileSystem()).mkdir(new FPath("/home/wolfgang", "/", "root"), "wolfgang", "wolfgang");
(new FileSystem()).mkdir(new FPath("/root", "/", "root"), "root", "root");
(new FileSystem()).mkdir(new FPath("/etc", "/", "root"), "root", "root");
(new FileSystem()).mkdir(new FPath("/etc/shell", "/", "root"), "root", "root");
