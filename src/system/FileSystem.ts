import { iFAccess, iFileSystem, iUserIdent } from "../interfaces/SystemInterfaces";
import { FPath, FSAccess, FSType } from "./filesystem/FSModels";
import PathResolver from "./filesystem/PathResolver";
import { System } from "./System";

const _setItem = Storage.prototype.setItem;
const _getItem = Storage.prototype.getItem;
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

const _cache: { [k: string]: string } = {};
let _cachePending: string[] = [];

const setItem = (key: string, value: string) => {
    _cache[key] = value;
    _cachePending.push(key);
    _cachePending = [...(new Set(_cachePending))];
    queueWrite();
}

const loadCache = () => {
    Object.keys(window.localStorage).forEach(k => {
        _cache[k] = _getItem.apply(window.localStorage, [k]) || "";
    });
}

const getKeys = (): string[] => {
    return Object.keys(_cache);
}

let writeTick: number | null = null;
let writeStart: number = 0;
const queueWrite = () => {
    if (writeTick !== null) return;
    if (writeStart == 0) {
        System.debug("Disk Write Pending", _cachePending.length);
        System.debug("Disk Write Done", null);
        System.debug("Disk Write Time", null);
        writeStart = performance.now();
    }
    writeTick = window.setTimeout(() => {
        if (_cachePending.length > 0) {
            const key = _cachePending.shift();
            if (key) {
                if (_cache.hasOwnProperty(key)) {
                    _setItem.apply(window.localStorage, [key, _cache[key]]);
                }
            }
        }
        writeTick = null;
        System.debug("Disk Write Pending", _cachePending.length);
        if (_cachePending.length > 0) {
            queueWrite();
        } else {
            writeStart = 0;
            System.debug("Disk Write Done", (new Date()).toTimeString());
            System.debug("Disk Write Time", performance.now() - writeStart);
            window.setTimeout(() => {
                System.debug("Disk Write Pending", null);
                System.debug("Disk Write Done", null);
                System.debug("Disk Write Time", null);
            }, 10000);
        }
    }, 50);
}

const forceSaveCache = () => {
    if (writeTick != null) {
        window.clearTimeout(writeTick);
    }
    _cachePending.forEach(key => {
        if (_cache.hasOwnProperty(key)) {
            _setItem.apply(window.localStorage, [key, _cache[key]]);
        }
    });
    console.log(`Wrote ${_cachePending.length} keys`);
};


const getItem = (key: string): string | null => {
    // if (!_cache.hasOwnProperty(key)) {
    //     const get = _getItem.apply(window.localStorage, [key]);
    //     if (get != null) _cache[key] = get;
    // }
    return _cache[key] || null;
}

const removeItem = (key: string) => {
    if (_cache.hasOwnProperty(key)) {
        delete _cache[key];
    }
    _removeItem.apply(window.localStorage, [key]);
    getKeys()
        .filter(k => k.startsWith(key + "/"))
        .forEach(k => removeItem(k));
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
        const t = this.getType(path);
        let v = getItem("FS:D:" + path.path);
        if (t == FSType.link) {
            v = getItem("FS:D:" + v);
        }
        return v;
    }

    public write(path: FPath, data: string): void {
        const t = this.getType(path);
        let p = path.path;
        if (t == FSType.link) {
            p = getItem("FS:D:" + p) || p;
        }
        setItem("FS:D:" + p, data);
        const perm = this.getPerm(path);
        perm.modifyTime = (Date.now() / 1000 | 0);
        this.setPerm(path, perm);
    }

    public delete(path: FPath): void {
        const t = this.getType(path);
        if (t !== null) {
            setItem(`!FS:T:${path.path}`, t);
            removeItem(`FS:T:${path.path}`);
            if (t == FSType.file) {
                setItem(`!FS:D:${path.path}`, this.read(path) || "");
                removeItem(`FS:D:${path.path}`);
            }
            setItem(`!FS:P:${path.path}`, this.getPerm(path).toString());
            removeItem(`FS:P:${path.path}`);
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
        const str = getItem("FS:P:" + path.path) || "";
        const perm = FSAccess.fromAccessString(str);
        if (perm.accessUndefined) {
            this.setPerm(path, perm);
        }
        return perm;
    }

    public list(path: FPath, deleted: boolean = false): string[] {
        return getKeys()
            .filter(key => key.startsWith("FS:T:") || (deleted ? key.startsWith("!FS:T:") : false))
            .map(key => key.substr(5))
            .filter(key => key.startsWith(path.path + (path.path == "/" ? "" : "/")) && key.length > path.path.length)
            .filter(key => !key.substr(path.path.length + (path.path == "/" ? 0 : 1)).includes("/"));
    }

    public static async boot() {

        const permRoot = new FSAccess("755", "root", "root");

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

        loadCache();
        window.onbeforeunload = () => {
            forceSaveCache();
        };
    }
}

