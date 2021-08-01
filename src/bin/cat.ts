import BaseApp from "./base/base";

export default class cat extends BaseApp {
    protected helpText =
        ` Usage: cat [path]...
 Print out the contents of files`;

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
