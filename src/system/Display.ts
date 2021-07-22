import { IOFeed } from "../interfaces/SystemInterfaces";

export default class Display {
    private static _instance: DisplayInstance | null = null;

    public static get instance(): DisplayInstance {
        if (Display._instance === null) {
            const elem = document.getElementById("main-display");
            if (elem === null) throw "#main-display not found";
            Display._instance = new DisplayInstance(elem);
        }
        return Display._instance;
    }

    public static hook(io: IOFeed): void {
        io.hookOut(Display.instance);
    }
}

class DisplayInstance implements IOFeed {

    private container: HTMLElement;
    private rowMinus: number = 0;

    private css: string[] = [];
    private style: { [k: string]: string } = {};


    constructor(elem: HTMLElement) {
        this.container = elem;
    }

    private getRow(line: number): HTMLSpanElement {
        if (line < 1) return this.newRow();
        const count = this.container.children.length;
        let row = this.container.children.item(count - line);
        if (!(row instanceof HTMLSpanElement)) {
            throw "DIPLAY LINE WAT " + line;
        }
        //@ts-ignore
        return row;
    }

    private newRow(): HTMLSpanElement {
        const row = document.createElement("span");
        this.container.append(row);
        return row;
    }

    hookOut(_hook: IOFeed): void {
        throw new Error("Method not implemented.");
    }

    input(input: string | string[] | string[][]): void {
        let line = this.rowMinus;
        if (typeof input == "string") {
            line += 1;
            input = input.split("\n");
        }
        input.forEach(ln => {
            if (ln instanceof Array) {
                ln = ln.join("\t");
            }
            ln.split("\n").forEach(txt => {
                let row = this.getRow(line);
                const raw = (row.dataset.raw || "") + txt
                const formated = this.formatTextRow(raw);
                if (formated instanceof Array) {
                    while (row.firstChild) {
                        row.removeChild(row.firstChild);
                    }
                    formated.map(f => row.append(f));
                } else {
                    row.textContent = formated;
                }
                row.dataset.raw = raw;
                line--;
            });
        });
        this.container.scrollTop = this.container.scrollHeight;
    }

    private formatTextRow(raw: string): HTMLSpanElement[] {
        raw = this.preProcessLine(raw);
        const parts = raw.split("🎨");
        if (parts.length > 1) {
            const spans: HTMLSpanElement[] = [];
            parts.forEach(p => {
                const span = document.createElement("span");
                const pr = p.split(";");
                const re = /[0-9A-Fa-f]{6}/g;
                const re2 = /[0-9A-Fa-f]{3}/g;

                if (pr.length > 1) {
                    const col = (pr.shift()?.toLowerCase().trim() || "white").split("-");
                    if (col.length < 2) col.unshift("fg");
                    if (re.test(col[1]) || re2.test(col[1])) {
                        if (col[0] == "bg") {
                            this.style["background-color"] = "#" + col[1];
                        } else {
                            this.style["color"] = "#" + col[1];
                        }
                    } else {
                        if (col[1] == "reset") {
                            this.css = [];
                            this.style = {};
                        } else {
                            this.css.push("col-" + col.join("-"));
                        }
                    }
                }

                const txt = pr.join(";");
                if (txt.length > 0) {
                    span.textContent = txt;
                    spans.push(this.styleSpan(span));
                }
            });
            return spans;
        } else {
            const span = document.createElement("span");
            span.textContent = raw;
            return [this.styleSpan(span)];
        }
    }

    private preProcessLine(line: string): string {
        const parts = line.split("🖥️");
        let out: string = parts.shift() || "";
        parts.forEach(p => {
            const ps = p.split(";");
            if (ps.length < 2) {
                p = "🖥️" + p;
            } else {
                const cmd = ps.shift();
                p = ps.join(";");
                switch (cmd) {
                    case "<":
                        out = out.substring(0, out.length - 1);
                        break;
                }

            }
            out += p;
        });
        return out;
    }

    private styleSpan(span: HTMLSpanElement): HTMLSpanElement {
        this.css.forEach(c => span.classList.add(c));
        Object.entries(this.style).forEach(v => {
            span.style.setProperty(v[0], v[1]);
        });
        return span;
    }
}