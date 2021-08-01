import BaseApp from "./base/base";

export default class pid extends BaseApp {
    protected helpText =
        ` Usage: pid
 print the (P)rocess (ID)dentifier number of the current process.`;

    public start(_args: string[]): void {
        this.endOutput(this.proc.parent?.pid.toString() || "n/a");
    }
}
