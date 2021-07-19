export interface iSystem {
    fileSystem: iFileSystem;
}

export interface iUserIdent {
    name: string;
    groups: string[];
}

export interface iFileSystem {
    read(name: string): string | null;
    write(name: string, data: string): void;
    mkdir(name: string): void;
    touch(name: string): void;
}

export interface iProcess {
    pid: number;
}

export interface iProcessInstance {
    //new(process: iProcess): iProcessInstance;
    run(args: string[]): void;
}