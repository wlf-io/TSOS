import { IOFeed, iOutput, iProcess, iProcessInstance, iSystem } from "../interfaces/SystemInterfaces";

(() => {
    class shell implements iProcessInstance {

        private proc: iProcess;
        private system: iSystem;
        private endPromise: { promise: Promise<iOutput>, res: (i: iOutput) => void, rej: (i: iOutput) => void };

        private outHooks: [IOFeed, string | null][] = [];

        private inputStr: string = "";

        constructor(proc: iProcess) {
            this.proc = proc;
            this.system = proc.system;
            let res = (_i: iOutput) => { };
            let rej = (_i: iOutput) => { };
            const prom: Promise<iOutput> = new Promise((_res, _rej) => {
                res = _res;
                rej = _rej;
            });
            this.endPromise = {
                promise: prom,
                res,
                rej
            };
        }

        kill(): void {
            this.endPromise.rej("kill");
        }

        hookOut(hook: IOFeed, ident: string | null = null): void {
            this.outHooks.push([hook, ident]);
        }

        private output(out: string | string[] | string[][]) {
            this.outHooks.forEach(hook => hook[0].input(out, hook[1]));
        }

        input(input: string | string[] | string[][]): void {
            switch (input) {
                case "Enter":
                    console.log("SHELL INPUT", this.inputStr);
                    this.output("🎨reset;");
                    this.output("\n");
                    if (this.inputStr.length) {
                        this.output(this.inputStr);
                        this.output("\n");
                    }
                    this.prompt();
                    this.inputStr = "";
                    break;
                case "Backspace":
                    "\ch"
                    if (this.inputStr.length > 0) {
                        this.inputStr = this.inputStr.substring(0, this.inputStr.length - 1);
                        this.output("🖥️<;");
                    }
                    break;
                default:
                    this.inputStr += input;
                    this.output(input);
                    break;
            }
        }

        run(args: string[]): Promise<iOutput> {
            if ((args[0] || "") == "--motd") {
                this.output([[this.proc.pid.toString(), ...args]]);
                this.output("\n");
            }
            //console.log(this.proc.pid, args);
            // this.output([[this.proc.pid.toString(), ...args]]);
            // this.output("🎨FF0;");
            // this.output(["RAAAAAAA\nAAAA\tA\tAAAA"]);
            // this.output("1");
            // this.output("🎨F00;");
            // this.output("🎨BG-00F;");
            // this.output("2");
            // this.output("🎨reset;");
            // this.output("3");
            // this.output("4");
            // this.output("5\n");
            this.prompt();
            return this.endPromise.promise;
        }

        private prompt(): void {
            this.output([
                "\u001B[0m",
                "\u001B[32m",
                `${this.system.user.name}@${this.hostname}`,
                "\u001B[0m:\u001B[34m",
                `${this.path}`,
                "\u001B[0m$ ",
            ].join(""));
        }

        private get path(): string {
            let path = this.system.fileSystem.cwd;
            const home = this.system.fileSystem.resolve("~");
            console.log(home, path);
            if (path.startsWith(home)) {
                path = "~" + path.substr(home.length);
            }
            return path;
        }

        private get hostname(): string {
            return "wlf.io";
        }

    }

    return shell;
})();