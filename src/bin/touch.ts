import BaseApp from "./base/base";

export default class touch extends BaseApp {

    public start(args: string[]): void {

        args.forEach(a => {
            try {
                this.system.fileSystem.touch(a);
            } catch (e) {
                this.output(e);
            }
        });

        this.endOutput("");
    }
}
