import BaseApp from "./base/base";

export default class mkdir extends BaseApp {

    public start(args: string[]): void {

        args.forEach(a => {
            try {
                this.system.fileSystem.mkdir(a);
            } catch (e) {
                this.output(e);
            }
        });

        this.endOutput("");
    }
}
