import { iFAccess, iFileSystem, iUserIdent, FSType } from "../interfaces/SystemInterfaces";
import { FPath, FSAccess } from "./filesystem/FSModels";
import PathResolver from "./filesystem/PathResolver";
import { System } from "./System";

const _setItem = Storage.prototype.setItem;
const _getItem = Storage.prototype.getItem;
//@ts-ignore
const _removeItem = Storage.prototype.removeItem;
Storage.prototype.setItem = (_key: string, _value: string) => {
    throw "Blocked";
};
Storage.prototype.getItem = (_key: string) => {
    throw "Blocked";
};
Storage.prototype.removeItem = (_key: string) => {
    throw "Blocked";
};

type FSTypeKey = "P" | "T" | "D";
type FSCache = { [k: string]: { P: string, T: string, D?: string } };


const _cache: FSCache = {};
let writeReasons: [string, string][] = [];
const setItem = (key: string, type: FSTypeKey, value: string) => {
    if (!_cache.hasOwnProperty(key)) _cache[key] = { P: "", T: "" };
    _cache[key][type] = value;
    writeReasons.push([key, type]);
    queueWrite();
}

const loadCache = () => {
    Object.keys(_cache).forEach(k => delete _cache[k]);
    const store: FSCache = JSON.parse(
        _getItem.apply(window.localStorage, ["FS"]) || "{}"
    );
    Object.entries(store).forEach(e => _cache[e[0]] = e[1]);
}

const getKeys = (): string[] => {
    return Object.keys(_cache);
}

let writeTick: number | null = null;
const queueWrite = () => {
    if (writeTick !== null) {
        window.clearTimeout(writeTick);
        writeTick = null;
    }
    writeTick = window.setTimeout(() => {
        _setItem.apply(window.localStorage, ["FS", JSON.stringify(_cache)]);
        if (System.isDebug) {
            console.log(writeReasons);
        }
        writeReasons = [];
        writeTick = null;
    }, 5000);
}

const forceSaveCache = () => {
    if (!System.isDebug || writeTick != null) {
        if (writeTick != null) {
            window.clearTimeout(writeTick);
            writeTick = null;
        }
        _setItem.apply(window.localStorage, ["FS", JSON.stringify(_cache)]);
        console.log("FORCE SAVE");
    }
};


const getItem = (key: string, type: FSTypeKey): string | null => {
    return (_cache[key] || {})[type] || null;
}

const removeItem = (key: string) => {
    if (_cache.hasOwnProperty(key)) {
        getKeys()
            .filter(k => k.startsWith(key + "/"))
            .forEach(k => removeItem(k));
        _cache[`!${key}`] = JSON.parse(JSON.stringify(_cache[key]));
        delete _cache[key];
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
        if (this.exists(path)) {
            this.writeCheck(path);
        } else {
            this.touch(path);
        }
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
        this.fs.mkdir(path, new FSAccess("755", this.user.name, this.user.name));
    }

    public touch(path: string | FPath) {
        path = this.ensureFPath(path);
        this.createCheck(path);
        this.fs.touch(path, new FSAccess("644", this.user.name, this.user.name));
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

    public cp(from: string | FPath, to: string | FPath, force?: boolean): void {
        force = force || false;
        from = this.ensureFPath(from);
        to = this.ensureFPath(to);
        if (!force || !this.exists(to)) {
            this.createCheck(to);
        } else this.writeCheck(to);
        this.readCheck(from);
        this.fs.cp(from, to, this.user.name);
    }

    public mv(from: string | FPath, to: string | FPath, force?: boolean): void {
        this.cp(from, to, force);
        this.delete(from);
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
            this.createCheck(path);
        } else if (!this.canWrite(path)) {
            throw `${path} access denied [WC]`;
        }
    }

    private readCheck(path: FPath): void {
        if (!this.exists(path)) {
            throw `${path.path} no such file`;
        }
        if (!this.canRead(path)) {
            throw `${path.path} access denied [RC]`;
        }
    }

    private executeCheck(path: FPath): void {
        if (!this.exists(path)) {
            throw `${path.path} no such file`;
        }
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
        if (!this.exists(path)) return false;
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
        this.user.setEnv("cwd_short", this.abreviate(path));
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

export class FileSystem {
    public mkdir(path: FPath, perm: FSAccess): void {
        this.setType(path, FSType.dir);
        this.setPerm(path, perm);
    }

    public touch(path: FPath, perm: FSAccess, data?: string): void {
        this.setType(path, FSType.file);
        this.setPerm(path, perm);
        this.write(path, data || "");
    }

    private setType(path: FPath, type: FSType): void {
        setItem(path.path, "T", type);
    }

    public setPerm(path: FPath, perm: FSAccess): void {
        setItem(path.path, "P", perm.toString());
    }

    public isType(path: FPath, type: FSType): boolean {
        return this.getType(path) == type;
    }

    public getType(path: FPath): FSType | null {
        const t: string = getItem(path.path, "T") || "";
        return FSType[t as keyof typeof FSType] || null;
    }

    public read(path: FPath): string | null {
        const t = this.getType(path);
        let v = getItem(path.path, "D");
        if (t == FSType.link) {
            v = getItem(v + "", "D");
        }
        return v;
    }

    public write(path: FPath, data: string): void {
        const t = this.getType(path);
        let p = path.path;
        if (t == FSType.link) {
            p = getItem(p, "D") || p;
        }
        setItem(p, "D", data);
        const perm = this.getPerm(path);
        perm.modifyTime = (Date.now() / 1000 | 0);
        this.setPerm(path, perm);
    }

    public delete(path: FPath): void {
        const t = this.getType(path);
        if (t !== null) {
            removeItem(path.path);
        }
    }

    public append(path: FPath, data: string): void {
        this.write(path, (this.read(path) || "") + data);
    }

    public prepend(path: FPath, data: string): void {
        this.write(path, data + (this.read(path) || ""));
    }

    public exists(path: FPath): boolean {
        return this.getType(path) != null;
    }

    public cp(from: FPath, to: FPath, user: string) {
        const type = this.getType(from);
        const perm = this.getPerm(from);
        perm.setOwner(user);
        perm.setGroup(user);
        if (type == FSType.file || type == FSType.link) {
            const data = this.read(from);
            this.touch(to, perm, data || "");
        } else if (type == FSType.dir) {
            this.mkdir(to, perm);
        }
    }

    public getPerm(path: FPath): FSAccess {
        const str = getItem(path.path, "P") || "";
        const perm = FSAccess.fromAccessString(str);
        if (perm.accessUndefined) {
            this.setPerm(path, perm);
        }
        return perm;
    }

    public list(path: FPath, _deleted: boolean = false): string[] {
        return getKeys()
            // Filter out any path that does start with out key + "/" to ensue sub items and not just items with longer names
            .filter(key => key.startsWith(path.path + (path.path == "/" ? "" : "/")) && key.length > path.path.length)
            // Filter out any paths that have further / in them, to only list one depth.
            .filter(key => !key.substr(path.path.length + (path.path == "/" ? 0 : 1)).includes("/"));
    }

    public static async boot() {

        const permRoot = new FSAccess("755", "root", "root");
        loadCache();

        (new FileSystem()).mkdir(new FPath("/", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FPath("/bin", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FPath("/home", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FPath("/home/guest", "/", "root"), new FSAccess("755", "guest", "guest"));
        (new FileSystem()).mkdir(new FPath("/home/wolfgang", "/", "root"), new FSAccess("755", "wolfgang", "wolfgang"));
        (new FileSystem()).mkdir(new FPath("/root", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FPath("/etc", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FPath("/etc/shell", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FPath("/usr", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FPath("/usr/bin", "/", "root"), permRoot);

        window.onbeforeunload = () => {
            forceSaveCache();
        };
    }
}

