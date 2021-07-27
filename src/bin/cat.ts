import BaseApp from "./base/base";

export default class cat extends BaseApp {

    public start(args: string[]): void {
        this.endOutput(args.map(a => {
            try {
                return this.system.fileSystem.read(a);
            } catch (e) {
                return "cat: " + e;
            }
        }));
    }
}
