import { iOutput } from "../interfaces/SystemInterfaces";
import BaseApp from "./base/base";

export default class watch extends BaseApp {

    private timer: number | null = null;
    private time = 2;

    public start(args: string[]): void {
        this.timer = window.setInterval(() => {
            this.watch(args);
        }, this.time * 1000);
        this.watch(args);
    }

    private watch(args: string[]) {
        this.output("\u001B[J");
        this.output(args);
        console.log(args);
    }

    public end(output: iOutput = "") {
        if (this.timer == null) return;
        window.clearInterval(this.timer);
        super.end(output);
    }
}
