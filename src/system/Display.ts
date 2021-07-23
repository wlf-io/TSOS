import { IOFeed, iOutput } from "../interfaces/SystemInterfaces";

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

type DisplayColour = { f: string | null, b: string | null };

class DisplayInstance implements IOFeed {

    private container: HTMLElement;
    // private rowMinus: number = 0;
    private column: number = -1;
    private row: number = 0;

    private data: string[] = [""];

    // private css: string[] = [];
    // private style: { [k: string]: string } = {};

    private colours: { [k: string]: { [k: string]: DisplayColour } } = {};


    constructor(elem: HTMLElement) {
        this.container = elem;
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

    private addColour(row: number, column: number, col: string): void {
        if (!this.colours.hasOwnProperty(`${row}`)) {
            this.colours[`${row}`] = {};
        }
        const colour: DisplayColour = this.colours[`${row}`][`${column}`] || { f: null, b: null };
        const cols = col.split(/[\[;]+/);

        parseInt(cols[cols.length - 1]);

        if (cols.length < 2) cols.unshift("f");
        if (cols[0] == "f") {
            colour.f = cols[1];
        } else {
            colour.b = cols[1];
        }
        this.colours[`${row}`][`${column}`] = colour;
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

    private redrawLines(lines: number[]): void {
        // let spans = this.container.children;
        lines.sort();
        lines.forEach(l => {
            const line = this.data[l];
            this.drawLine(line, l);
        });
    }

    private drawLine(line: string, index: number): void {
        const colours = this.colours[index] || {};
        const cols: number[] = Object.keys(colours).map(c => parseInt(c));
        let last: number = 0;
        const parts: string[] = [];
        cols.forEach(c => {
            if (c == 0) return;
            parts.push(line.substring(last, c));
            last = c;
        });
        parts.push(line.substring(last));
        console.log(parts, cols, Object.keys(colours).map(c => parseInt(c)), colours);
    }


    private writeInputToData(input: string): number[] {
        const linesAffected: number[] = [];

        const lex = DisplayLexer.createFromString(input, { "\u001B": ["m"] });

        while (!lex.eof()) {
            const next = lex.next() || "";
            const r = this.data.length - 1 - this.row;
            switch (next[0] || "") {
                case "\u001B":
                    console.log("ADD COLOR");
                    let c = this.column < 0 ? this.data[r].length - 1 : this.column;
                    if (c < 0) c = 0;
                    this.addColour(r, this.column < 0 ? this.data[r].length - 1 : this.column, next);
                    linesAffected.push(r);
                    break;
                case "\n":
                    this.row--;
                    if (this.row < 0) {
                        this.data.push("");
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

type LexToke = { [k: string]: string[] };

class DisplayLexer {
    private input: DisplayStream;
    private tokes: LexToke = {};

    public static createFromString(input: string, tokes: LexToke) {
        return new DisplayLexer(new DisplayStream(input), tokes);
    }

    constructor(input: DisplayStream, tokes: LexToke) {
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
            // console.log("TEST: ", toke, end, s);
            return end.includes(s);
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

class DisplayStream {
    private input: string;

    private lin: number = 0;

    private pos: number = 0;

    private col: number = 0;

    constructor(input: string) {
        this.input = input;
    }

    get position(): number {
        return this.pos;
    }

    get line(): number {
        return this.lin;
    }

    get column(): number {
        return this.col;
    }

    public next(): string {
        const char = this.peek();
        this.pos++;
        if (char == "\n") {
            this.lin++;
            this.col = 0;
        } else {
            this.col++;
        }
        return char;
    }

    public peek(count: number = 0): string {
        return this.input.charAt(this.pos + count);
    }

    public eof() {
        return this.peek() == "";
    }

    public croak(error: string) {
        return new Error(`[${this.line}:${this.col}] - ${error}`);
    }

    public rewindTo(position: number) {
        this.rewind();
        while (this.pos < position) {
            this.next();
        }
    }

    public rewind() {
        this.pos = 0;
        this.lin = 0;
        this.col = 0;
    }
}