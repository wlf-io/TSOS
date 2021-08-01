import { iOutput } from "../interfaces/SystemInterfaces";
import BaseApp, { AppState } from "./base/base";

export default class watch extends BaseApp {

    protected helpText =
        ` Usage: watch [arguments]...
 run a command repeatedly to monitor its output`;

    private time = 2;

    public async start(_args: string[]) {
        while (this.state == AppState.running) {
            await this.watch();
            await (new Promise(res => window.setTimeout(() => res(1), this.time * 1000)));
        }
        this.end("");
    }

    private async watch() {
        const proc = this.proc.createProcess("shell", ["-c", ...this.rawArgs]);
        proc.hookOut(this, "watch");
        this.output("\u001B[J");
        await proc.run();
    }

    passInput(input: iOutput, ident: string) {
        if (ident != "watch") return;
        this.output(input);
    }
}
