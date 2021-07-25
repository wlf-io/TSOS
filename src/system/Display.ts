import { IOFeed, iOutput } from "../interfaces/SystemInterfaces";
import DisplayLexer from "./display/DisplayLexer";

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

    private state: string = "";

    private container: HTMLElement;
    private column: number = -1;
    private row: number = 0;

    private data: string[] = [""];

    private colours: { [k: string]: { [k: string]: DisplayStyle } } = {};


    constructor(elem: HTMLElement) {
        this.container = elem;
        this.emptyElem(this.container);
        this.container.append(document.createElement("span"));
    }

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
        console.log("DISPLAY INPUT", typeof _input == "string" ? _input.split("") : _input);
        if (_input == "\u007F") {
            this.state = "bs";
            console.log("BACKSPACE START");
        }
        let input = "";
        if (_input instanceof Array) {
            input = _input.map(i => (i instanceof Array) ? i.join("\t") : i).join("\n");
        } else {
            input = _input;
        }

        const lines: number[] = this.writeInputToData(input);

        this.redrawLines(lines);

        this.container.scrollTop = this.container.scrollHeight;
        this.state = "";
    }

    private emptyElem(elem: Element): void {
        while (elem.firstChild) {
            elem.removeChild(elem.firstChild);
        }
    }

    private redrawLines(lines: number[]): void {
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

        const lex = DisplayLexer.createFromString(input, [
            { s: /[\u0000-\u001F]/, e: /[a-z]/ },
            { s: /[\u007F]/, e: null },
        ]);

        while (!lex.eof()) {
            const next = lex.next() || "";
            if (this.state == "bs") {
                console.log(next);
            }

            const r = this.data.length - 1 - this.row;
            let c = this.column < 0 ? this.data[r].length - 1 : this.column;
            if (c < 0) c = 0;
            if (/[\u0000-\u001F]/.test(next[0] || "")) {
                linesAffected.push(...this.handleEscapeSequence(r, c, next));
            } else {
                switch (next[0] || "") {
                    case "\u007F":
                        console.log("BACKSPACE");
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
        }

        return [...new Set(linesAffected)];
    }
}