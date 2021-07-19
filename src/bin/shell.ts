import { iProcess, iProcessInstance } from "../interfaces/SystemInterfaces";

(() => {
    class shell implements iProcessInstance {

        private proc: iProcess;

        constructor(proc: iProcess) {
            this.proc = proc;
        }

        run(args: string[]): void {
            console.log(this.proc.pid, args);
        }

    }

    return shell;
})();