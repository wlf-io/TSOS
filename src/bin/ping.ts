import BaseApp from "./base/base";

export default class ping extends BaseApp {

    private count: number = 5;

    public start(args: string[]): void {
        if (args.length != 1) {
            this.fail("useage : ping <flags> [address]");
        }
        this.doPing(args[0], this.count);
    }

    private async doPing(address: string, count: number) {
        const r: number[] = [];
        while (--count >= 0) {
            const t = await this.ping(address);
            this.output(t.toString() + "\n");
            r.push(t);
            await (new Promise(res => window.setTimeout(() => res(1), 1000)));
        }
        this.endOutput("");
    }

    private async ping(address: string): Promise<number> {
        const t = performance.now();
        try {
            await fetch(address)
        } catch (e) {

        }
        return performance.now() - t;
    }
}
