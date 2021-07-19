import { iUserIdent } from "../interfaces/SystemInterfaces";

export class UserIdent implements iUserIdent {
    private _name: string;
    private _groups: string[];

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

}