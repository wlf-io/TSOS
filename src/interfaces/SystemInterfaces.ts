export interface iSystem {
    fileSystem: iFileSystem;
    user: iUserIdent;
    clone(): iSystem;
    createProcess(bin: string, args: string[], creator: iProcess): iProcess;
    debug(key: string, value: any): void;
    isDebug: boolean;
}

export interface iUserIdent {
    name: string;
    groups: string[];

    getEnv(key: string): string | null;
    setEnv(key: string, value: string): void;
    remEnv(key: string): void;
    listEnv(): [string, string][];
    clone(): iUserIdent;
}

export interface iFAccess {
    permString: string;
    longPermString: string;
    owner: string;
    group: string;
    accessTime: number;
    modifyTime: number;
    changeTime: number;
    createTime: number;
    canRead(user: iUserIdent): boolean;
    canWrite(user: iUserIdent): boolean;
    canExecute(user: iUserIdent): boolean;
    setOwner(owner: string): void;
    setGroup(group: string): void;
    setPerm(perm: string): void;
}

export interface iFileSystemPath {
    parent: iFileSystemPath;
    path: string;
    isRoot: boolean;
    toString(): string;
    parentList: iFileSystemPath[];
}

export interface iFile {
    access: iFAccess;
    type: FSType;
    path: iFileSystemPath;
    content: string;
}

export interface iFileSystem {
    read(path: string): string;
    write(path: string, data: string): void;
    append(path: string, data: string): void;
    prepend(path: string, data: string): void;
    mkdir(path: string): void;
    touch(path: string): void;
    isFile(path: string): boolean;
    isDir(path: string): boolean;
    exists(path: string): boolean;
    cwd: string;
    setCwd(path: string): void;
    resolve(path: string): string;
    clone(user?: iUserIdent): iFileSystem;
    canRead(path: string): boolean;
    canWrite(path: string): boolean;
    canExecute(path: string): boolean;
    chmod(path: string, perm: string): void;
    chown(path: string, user: string, group: string): void;
    list(path: string, trim?: boolean): string[];
    getPerm(path: string): iFAccess
    abreviate(path: string): string;
    delete(path: string): void;
    cp(from: string, to: string, force?: boolean): void;
    mv(from: string, to: string, force?: boolean): void;
}

export type iOutput = string | string[] | string[][];

export interface IOFeed {
    hookOut(hook: IOFeed, ident: string | null): void;
    input(input: iOutput, ident: string | null): void;
    end(input: iOutput): void;
}

export interface iProcess extends IOFeed {
    pid: number;
    run(): Promise<iOutput>;
    kill(): void;
    system: iSystem;
    fileSystem: iFileSystem;
    createProcess(location: string, args: string[]): iProcess;
    parent: iProcess | null;
}

export interface iProcessInstance extends IOFeed {
    //new(process: iProcess): iProcessInstance;
    run(args: string[]): Promise<iOutput>;
    kill(): void;
}

export enum FSPerm {
    execute = 1,
    write = 2,
    read = 4,
}

export enum FSType {
    file = "file",
    dir = "dir",
    in = "in",
    out = "out",
    link = "link"
}
