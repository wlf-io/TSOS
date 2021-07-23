export interface iSystem {
    fileSystem: iFileSystem;
    user: iUserIdent;
}

export interface iUserIdent {
    name: string;
    groups: string[];
}

export interface iFileSystem {
    read(path: string): string | null;
    write(path: string, data: string): void;
    mkdir(path: string): void;
    touch(path: string): void;
    isFile(path: string): boolean;
    isDir(path: string): boolean;
    cwd: string;
    setCwd(path: string): void;
    resolve(path: string): string;
}

export type iOutput = string | string[] | string[][];

export interface IOFeed {
    hookOut(hook: IOFeed, ident: string | null): void;
    input(input: iOutput, ident: string | null): void;
}

export interface iProcess extends IOFeed {
    pid: number;
    run(args: string[]): Promise<iOutput>;
    kill(): void;
    system: iSystem;
    fileSystem: iFileSystem;
}

export interface iProcessInstance extends IOFeed {
    //new(process: iProcess): iProcessInstance;
    run(args: string[]): Promise<iOutput>;
    kill(): void;
}
