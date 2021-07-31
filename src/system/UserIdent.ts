import { iUserIdent } from "../interfaces/SystemInterfaces";

export class UserIdent implements iUserIdent {
    private _name: string;
    private _groups: string[];
    private _env: UserEnv;


    constructor(name: string, groups: string[], env?: UserEnv) {
        this._env = env || new UserEnv();
        this._name = name;
        this._groups = groups;
    }

    public get name(): string {
        return this._name;
    }

    public get groups(): string[] {
        return [...this._groups];
    }

    private get env() {
        return this._env.vars;
    }

    public getEnv(key: string): string | null {
        key = key.toUpperCase().trim();
        if (key == "USER") return this.name;
        return this.env[key] || null;
    }

    public setEnv(key: string, value: string): void {
        key = key.toUpperCase().trim();
        this.env[key] = value;
    }

    public listEnv(): [string, string][] {
        return Object.entries(this.env);
    }

    public remEnv(key: string): void {
        key = key.toUpperCase().trim();
        if (this.env.hasOwnProperty(key)) {
            delete this.env[key];
        }
    }

    public clone(): UserIdent {
        const user = new UserIdent(this.name, this.groups, this._env);
        return user;
    }

}

class UserEnv {
    public vars: { [k: string]: string } = {
        "PATH": "/bin"
    }
}
