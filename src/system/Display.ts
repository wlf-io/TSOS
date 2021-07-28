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
        span.classList.add("disp-row-segment");
        return span;
    }
}

class DisplayInstance implements IOFeed {

    private container: HTMLElement;
    private column: number = 0;
    private row: number = 0;

    private data: string[] = [""];

    private outHooks: [IOFeed, string][] = [];

    private colours: { [k: string]: { [k: string]: DisplayStyle } } = {};


    constructor(elem: HTMLElement) {
        this.container = elem;
        this.emptyElem(this.container);
        this.container.append(document.createElement("span"));
    }
    end(_input: iOutput): void {
        throw new Error("Method not implemented.");
    }

    hookOut(hook: IOFeed, ident: string): void {
        this.outHooks.push([hook, ident]);
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

        if (col === "0") {
            style.f = "reset";
            style.b = "reset";
            style.s = "reset";
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

        this.redrawLines(lines);

        this.container.scrollTop = this.container.scrollHeight;
    }

    private output(output: iOutput, ident?: string): void {
        this.outHooks.forEach(h => h[0].input(output, ident || h[1]));
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
            // console.log("Redraw", l, line);
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


        const rowNum = this.data.length - 1 - this.row;
        let colNum = this.column < 0 ? this.data[rowNum].length - 1 : this.column;
        if (colNum < 0) colNum = 0;

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

        if (index == rowNum) {
            const caretSpan = document.createElement("span");
            caretSpan.classList.add("caret-span")
            caretSpan.textContent = (new Array(colNum + 1)).join(" ");
            row.append(caretSpan);
        }

        parts.map((txt, i) => {
            const span = document.createElement("span");
            span.textContent = txt.split("").join("\u200B");
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
            case "j":
                this.data = [""];
                this.row = 0;
                row = 0;
                column = 0;
                this.column = 0;
                this.colours = {};
                this.emptyElem(this.container);
                this.container.append(document.createElement("span"));
                rowsAffected.push(0);
                break;
            case "c":
                this.column++;
                rowsAffected.push(row);
                break;
            case "d":
                this.column--;
                if (this.column < 0) this.column = 0;
                rowsAffected.push(row);
                break;
            case "k":
                this.data[row] = this.data[row].substring(0, column);
                const cols = this.colours[row.toString()] || {};
                this.colours[row.toString()] = {};
                Object.entries(cols).filter(e => (parseInt(e[0]) || 0) <= column)
                    .forEach(e => {
                        this.colours[row][e[0].toString()] = e[1];
                    });
                rowsAffected.push(row);
                break;
            case "n":
                this.output(`\u001B[${row};${column}R`);
                break;
            default:
                console.log("Unhandled Escape Sequence", sequence);
        }
        if (this.column < 0) this.column = 0;
        if (this.column > this.data[row].length) this.column = this.data[row].length;
        return rowsAffected;
    }

    private handleSpecialChar(char: string): number[] {
        const r = this.data.length - 1 - this.row;
        const row: string = this.data[r];
        let c = this.column < 0 ? this.data[r].length - 1 : this.column;
        if (c < 0) c = 0;
        const linesAffected: number[] = [];
        switch (char) {
            case "\n":
                this.row--;
                if (this.row < 0) {
                    this.data.push("");
                    this.container.append(document.createElement("span"));
                    this.row = 0;
                    this.column = 0;
                    linesAffected.push(r);
                    linesAffected.push(this.data.length - 1);
                }
                break;
            case "\u0007":
                this.beep();
                break;
            case "\b":
                if (row.length > 0) {
                    this.data[r] = row.substring(0, c - 1) + row.substring(c);
                    c--;
                    this.column = c;
                    linesAffected.push(r);
                } else {
                    console.log("handle going back a line");
                }
                break;
            case "\u007F":
                if (row.length > 0) {
                    this.data[r] = row.substring(0, c) + row.substring(c + 1);
                    linesAffected.push(r);
                } else {
                    console.log("handle going back a line");
                }
                break;
            case "\t":
                linesAffected.push(...this.handleChars(char));
                break;
            default:
                linesAffected.push(...this.handleChars("[" + encodeURIComponent(char) + "]"));
                break;
        }
        return linesAffected;
    }

    private writeInputToData(input: string): number[] {
        const linesAffected: number[] = [];

        const lex = DisplayLexer.createFromString(input, [
            { s: /[\u001B]/, e: /[a-zA-Z]/ },
            { s: /[\u0000-\u001A\u007F]/, e: null },
        ]);

        while (!lex.eof()) {
            const next = lex.next() || "";

            if (/[\u0000-\u001A\u007F]/.test(next[0] || "")) {
                linesAffected.push(...this.handleSpecialChar(next))
            } else {
                linesAffected.push(...this.handleChars(next));
            }
        }

        return [...new Set(linesAffected)];
    }

    private handleChars(next: string): number[] {

        const r = this.data.length - 1 - this.row;
        let c = this.column < 0 ? this.data[r].length - 1 : this.column;
        if (c < 0) c = 0;
        const linesAffected: number[] = [];
        switch (next[0] || "") {
            case "\u001B":
                linesAffected.push(...this.handleEscapeSequence(r, c, next));
                break;
            default:
                let row = this.data[r];
                if (this.column >= row.length || this.column < 0) {
                    row += next;
                } else {
                    row = row.substr(0, this.column) + next + row.substr(this.column + next.length);
                }
                this.column += next.length;
                this.data[r] = row;
                linesAffected.push(r);
                break;
        }
        return linesAffected;
    }

    private beep() {
        var snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
        snd.play();
    }

}
