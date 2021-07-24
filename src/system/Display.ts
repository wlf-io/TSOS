import { IOFeed, iOutput } from "../interfaces/SystemInterfaces";
import LexerStream from "../shared/LexerStream";

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

    public static hookOut(io: IOFeed, ident: string | null = null): void {
        io.hookOut(Display.instance, ident);
    }
}

class DisplayStyle {
    public f: string | null = null;
    public b: string | null = null;
    public s: string | null = null;
    public r: string | null = null;

    public styleSpan(span: HTMLSpanElement): HTMLSpanElement {
        if (this.f != null) {
            span.classList.add("col-fg-" + this.f);
        }
        if (this.b != null) {
            span.classList.add("col-bg-" + this.b);
        }
        if (this.s != null) {
            span.classList.add("styl-" + this.s);
        }
        return span;
    }
}

class DisplayInstance implements IOFeed {

    private container: HTMLElement;
    // private rowMinus: number = 0;
    private column: number = -1;
    private row: number = 0;

    private data: string[] = [""];

    // private css: string[] = [];
    // private style: { [k: string]: string } = {};

    private colours: { [k: string]: { [k: string]: DisplayStyle } } = {};


    constructor(elem: HTMLElement) {
        this.container = elem;
        this.emptyElem(this.container);
        this.container.append(document.createElement("span"));
    }

    // private getRow(line: number): HTMLSpanElement {
    //     if (line < 1) return this.newRow();
    //     const count = this.container.children.length;
    //     let row = this.container.children.item(count - line);
    //     if (!(row instanceof HTMLSpanElement)) {
    //         throw "DIPLAY LINE WAT " + line;
    //     }
    //     //@ts-ignore
    //     return row;
    // }

    // private newRow(): HTMLSpanElement {
    //     const row = document.createElement("span");
    //     this.container.append(row);
    //     return row;
    // }

    hookOut(_hook: IOFeed): void {
        throw new Error("Method not implemented.");
    }

    private mapStyleNum(num: number): string | null {
        let style: null | string = null;
        switch (num) {
            case 1:
                style = "bold";
                break;
            case 3:
                style = "italic";
            case 4:
                style = "underline";
                break;
            case 5:
                style = "blink";
                break;
            case 6:
                style = "blick-fast";
                break;
            case 7:
                style = "reverse";
                break;
            case 8:
                style = "hide";
                break;
            case 9:
                style = "strike";
                break;
            case 0:
            default:
                style = null;
                break;
        }
        return style;
    }

    private mapColour(c: number): string {
        const colours: { [k: string]: string } = {
            "0": "black",
            "1": "red",
            "2": "green",
            "3": "yellow",
            "4": "blue",
            "5": "purple",
            "6": "cyan",
            "7": "white",
        };


        return colours[c.toString().charAt(c.toString().length - 1)] || "white";
    }

    private mapColourType(c: number): "f" | "b" {
        if (c >= 40 && c < 50) return "b";
        return "f";
    }

    private addColour(row: number, column: number, col: string): number[] {
        if (!this.colours.hasOwnProperty(`${row}`)) {
            this.colours[`${row}`] = {};
        }
        const style: DisplayStyle = this.colours[`${row}`][`${column}`] || new DisplayStyle();
        style.r = col;
        const cols = col.split(";");
        const colnum: number = parseInt(cols.pop() || "0");
        const stylnum: number = parseInt(cols.pop() || "0");

        const colour = this.mapColour(colnum)

        style.s = this.mapStyleNum(stylnum)

        if (this.mapColourType(colnum) == "b") {
            style.b = colour;
        } else {
            style.f = colour;
        }

        this.colours[`${row}`][`${column}`] = style;
        return [row];
    }

    input(_input: iOutput, _ident: string | null): void {
        let input = "";
        if (_input instanceof Array) {
            input = _input.map(i => (i instanceof Array) ? i.join("\t") : i).join("\n");
        } else {
            input = _input;
        }

        const lines: number[] = this.writeInputToData(input);

        // console.log(lines, this.data, this.colours);

        this.redrawLines(lines);

        this.container.scrollTop = this.container.scrollHeight;
    }

    private emptyElem(elem: Element): void {
        while (elem.firstChild) {
            elem.removeChild(elem.firstChild);
        }
    }

    private redrawLines(lines: number[]): void {
        // let spans = this.container.children;
        lines.sort();
        lines.forEach(l => {
            const line = this.data[l];
            this.drawLine(line, l);
        });
    }

    private getLastDisplayStyleBefore(line: number): DisplayStyle {
        let set: [number, [number, DisplayStyle][]][] = Object.entries(this.colours).map(v => {
            const entries = Object.entries(v[1]);
            return [parseInt(v[0]), entries.map(v => [parseInt(v[0]), v[1]])];
        });
        set = set.filter(v => v[0] < line);
        set = set.filter(v => v[1].length);
        set.sort((a, b) => b[0] - a[0]);
        ((set[0] || [])[1] || []).sort((a, b) => b[0] - a[0]);
        return (((set[0] || [])[1] || [])[0] || [])[1] || new DisplayStyle();
    }

    private drawLine(line: string, index: number): void {

        const row = this.container.children.item(index);
        if (row == null) {
            console.log("couldnt find row for", index, line);
            return;
        }

        const colours = this.colours[index] || {};

        if (!colours.hasOwnProperty("0")) {
            colours["0"] = this.getLastDisplayStyleBefore(index);
        }
        const cols: number[] = Object.keys(colours).map(c => parseInt(c));
        let last: number = 0;
        const parts: string[] = [];
        cols.forEach(c => {
            if (c == 0) return;
            parts.push(line.substring(last, c));
            last = c;
        });
        parts.push(line.substring(last));


        this.emptyElem(row);

        parts.map((txt, i) => {
            const span = document.createElement("span");
            span.textContent = txt;
            const style = Object.values(colours)[i] || null;
            if (style !== null) {
                return style.styleSpan(span);
            }
            return span;
        }).forEach(span => {
            row.append(span);
        });
    }


    private handleEscapeSequence(row: number, column: number, sequence: string): number[] {
        let rowsAffected: number[] = [];
        const type = sequence.charAt(sequence.length - 1).toLowerCase();
        const pass = sequence.substring(2, sequence.length - 1);
        switch (type) {
            case "m":
                rowsAffected = this.addColour(row, column, pass);
                break;
            default:
                console.log("Unhandled Escape Sequence", sequence);
        }
        return rowsAffected;
    }


    private writeInputToData(input: string): number[] {
        const linesAffected: number[] = [];

        const lex = DisplayLexer.createFromString(input, { "\u001B": [/[a-z]/] });

        while (!lex.eof()) {
            const next = lex.next() || "";
            const r = this.data.length - 1 - this.row;
            let c = this.column < 0 ? this.data[r].length - 1 : this.column;
            if (c < 0) c = 0;
            switch (next[0] || "") {
                case "\u001B":
                    linesAffected.push(...this.handleEscapeSequence(r, c, next));
                    break;
                case "\n":
                    this.row--;
                    if (this.row < 0) {
                        this.data.push("");
                        this.container.append(document.createElement("span"));
                        this.row = 0;
                        this.column = 0;
                        linesAffected.push(this.data.length - 1);
                    }
                    break;
                default:
                    let row = this.data[r];
                    if (this.column >= row.length || this.column < 0) {
                        row += next;
                    } else {
                        row = row.substr(0, this.column) + next + row.substr(this.column + next.length);
                    }
                    if (this.column > -1) {
                        this.column += next.length;
                    }
                    this.data[r] = row;
                    linesAffected.push(r);
                    break;
            }
        }

        return [...new Set(linesAffected)];
    }

    // private updateData(line: string): number[] {
    //     let rows: number[] = [];

    //     const parts = line.split(/(?=[🖥️])|(?<=[🖥️])/g);



    //     return rows;
    // }

    // private updateDataLine(line: string, row: number, col: number) {

    // }


    // private formatTextRow(raw: string): HTMLSpanElement[] {
    //     // raw = this.preProcessLine(raw);
    //     const parts = raw.split("🎨");
    //     if (parts.length > 1) {
    //         const spans: HTMLSpanElement[] = [];
    //         parts.forEach(p => {
    //             const span = document.createElement("span");
    //             const pr = p.split(";");
    //             const re = /[0-9A-Fa-f]{6}/g;
    //             const re2 = /[0-9A-Fa-f]{3}/g;

    //             if (pr.length > 1) {
    //                 const col = (pr.shift()?.toLowerCase().trim() || "white").split("-");
    //                 if (col.length < 2) col.unshift("fg");
    //                 if (re.test(col[1]) || re2.test(col[1])) {
    //                     if (col[0] == "bg") {
    //                         this.style["background-color"] = "#" + col[1];
    //                     } else {
    //                         this.style["color"] = "#" + col[1];
    //                     }
    //                 } else {
    //                     if (col[1] == "reset") {
    //                         this.css = [];
    //                         this.style = {};
    //                     } else {
    //                         this.css.push("col-" + col.join("-"));
    //                     }
    //                 }
    //             }

    //             const txt = pr.join(";");
    //             if (txt.length > 0) {
    //                 span.textContent = txt;
    //                 spans.push(this.styleSpan(span));
    //             }
    //         });
    //         return spans;
    //     } else {
    //         const span = document.createElement("span");
    //         span.textContent = raw;
    //         return [this.styleSpan(span)];
    //     }
    // }

    // private preProcessLine(line: string): string {
    //     const parts = line.split("🖥️");
    //     let out: string = parts.shift() || "";
    //     parts.forEach(p => {
    //         const ps = p.split(";");
    //         if (ps.length < 2) {
    //             p = "🖥️" + p;
    //         } else {
    //             const cmd = ps.shift();
    //             p = ps.join(";");
    //             switch (cmd) {
    //                 case "<":
    //                     out = out.substring(0, out.length - 1);
    //                     break;
    //             }

    //         }
    //         out += p;
    //     });
    //     return out;
    // }

    // private styleSpan(span: HTMLSpanElement): HTMLSpanElement {
    //     this.css.forEach(c => span.classList.add(c));
    //     Object.entries(this.style).forEach(v => {
    //         span.style.setProperty(v[0], v[1]);
    //     });
    //     return span;
    // }
}

type LexToke = { [k: string]: (string | RegExp)[] };

class DisplayLexer {
    private input: LexerStream;
    private tokes: LexToke = {};

    public static createFromString(input: string, tokes: LexToke) {
        return new DisplayLexer(new LexerStream(input), tokes);
    }

    constructor(input: LexerStream, tokes: LexToke) {
        this.input = input;
        this.tokes = tokes;
    }

    public all(): string[] {
        this.rewind();
        let next = this.next();
        const all: string[] = [];
        while (next != null) {
            all.push(next);
            next = this.next();
        }
        return all;
    }

    public eof(): boolean {
        return this.input.eof();
    }

    public rewind(): void {
        this.input.rewind();
    }

    public next(): string | null {
        if (this.input.eof()) return null;
        if (this.nextIsStarter()) {
            return this.readToken();
        } else {
            return this.input.next();
        }
    }

    private nextIsStarter(): boolean {
        return this.isStarter(this.input.peek());
    }

    private isStarter(s: string): boolean {
        // console.log("test is starter", s);
        return Object.keys(this.tokes).includes(s);
    }

    private readToken(): string {
        const toke = this.input.peek();
        const end = this.tokes[toke] || ";";
        return this.readUntil(s => {
            return end.some(e => {
                let p = false;
                if (typeof e === "string") {
                    p = e == s;
                } else {
                    p = e.test(s);
                }
                return p;
            });
        });
    }


    private readUntil(func: (current: string, next: string) => boolean): string {
        let str = "";
        while (!this.input.eof()) {
            const s = this.input.next();
            str += s;
            if (func(s, this.input.peek())) break;
        }
        return str;
    }
}