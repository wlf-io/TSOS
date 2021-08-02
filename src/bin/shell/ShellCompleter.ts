import { iProcess, iSystem } from "../../interfaces/SystemInterfaces";
import ShellLexer, { ShellToken, TokenType } from "./ShellLexer";

export default class ShellCompleter {

    private lexer: ShellLexer;
    private input: string;
    private system: iSystem;
    private process: iProcess;

    constructor(input: string, proc: iProcess) {
        this.lexer = ShellLexer.createFromString(input);
        this.input = input;
        this.system = proc.system;
        this.process = proc;
    }

    public async predict(): Promise<{ txt: string, predictions: string[] }> {
        const tokens = this.lexer.getAll();

        const last = tokens.pop() || null;

        let current: boolean = true;

        const text = last?.value || "";


        if (last) {
            let incompleteString = last.type == TokenType.string && (last.raw.charAt(0) != last.raw.charAt(last.raw.length - 1));

            if (this.input.endsWith(" ") && !incompleteString) {
                current = false;
            }
        }

        let predictions: string[] = [];
        if (tokens.length == 0 && current) {
            predictions = [...(await this.predictBins(text))];
        } else {
            predictions = [...(await this.predictFiles(current ? text : ""))];
        }

        if (predictions.length == 0) {
            throw "no results";
        }

        if (predictions.length == 1) {
            predictions = [this.trimPrediction(predictions[0], current ? last : null)];
        }

        return { txt: current ? (last?.raw || "") : "", predictions };
    }

    private trimPrediction(prediction: string, last: ShellToken | null): string {
        let r = last?.raw || "";
        let l = r.length;
        while (--l >= 0) {
            if (prediction.startsWith(r.substr(l))) {
                prediction = prediction.substr(r.length - l);
            }
        }
        if (last?.type != TokenType.string) {
            prediction = prediction.split(" ").join("\\ ");
        }
        return prediction;
    }

    private async predictBins(txt: string): Promise<string[]> {
        const bins = (await this.getBins()).filter(t => t.startsWith(txt));
        if (bins.length == 1 && bins[0] == txt) throw " ";
        return bins;
    }

    private async getBins(): Promise<string[]> {
        const path = this.system.user.getEnv("path") || "/bin";
        const paths = path.split(";").map(p => p.trim());

        let bins: string[] = [];

        for (const p of paths) {
            const proc = this.process.createProcess("ls", ["-c", p]);
            const resp = await proc.run();
            if (resp instanceof Array) {
                const first = resp.pop();
                if (first instanceof Array) {
                    bins = [...bins, ...first];
                }
            }
        }
        return bins;
    }

    private async predictFiles(txt: string): Promise<string[]> {
        txt = txt || "./";

        const parts = txt.split("/");
        const start = parts.pop() || "";

        const parent = parts.join("/") || (txt.startsWith("/") ? "/" : ".");

        const proc = this.process.createProcess("ls", ["-c", parent]);
        const resp = await proc.run();

        console.log("F PRED", txt, parts, start, parent, resp);

        let predictions: string[] = [];
        if (resp instanceof Array) {
            const first = resp.pop();
            if (first instanceof Array) {
                predictions = [...first];
            }
        }

        return predictions.filter(p => p.startsWith(start));
    }
}
