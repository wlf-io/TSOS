import { iUserIdent } from "../interfaces/SystemInterfaces";

export class UserIdent implements iUserIdent {
    private _name: string;
    private _groups: string[];
    private _env: { [k: string]: string } = {
        "PATH": "/bin"
    };

    constructor(name: string, groups: string[]) {
        this._name = name;
        this._groups = groups;
    }

    public get name(): string {
        return this._name;
    }

    public get groups(): string[] {
        return [...this._groups];
    }

    public getEnv(key: string): string {
        key = key.toUpperCase();
        if (key == "USER") return this.name;
        return this._env[key] || "";
    }

    public setEnv(key: string, value: string): void {
        key = key.toUpperCase();
        this._env[key] = value;
    }

    public getEnvEntries(): [string, string][] {
        return Object.entries(this._env);
    }

    public remEnv(key: string): void {
        key = key.toUpperCase();
        if (this._env.hasOwnProperty(key)) {
            delete this._env[key];
        }
    }

    public clone(): UserIdent {
        const user = new UserIdent(this.name, this.groups);
        this.getEnvEntries().forEach(v => user.setEnv(v[0], v[1]));
        return user;
    }

}
