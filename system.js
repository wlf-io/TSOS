/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 93:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
class LexerStream {
    constructor(input) {
        this.lin = 0;
        this.pos = 0;
        this.col = 0;
        this.input = input;
    }
    get position() {
        return this.pos;
    }
    get line() {
        return this.lin;
    }
    get column() {
        return this.col;
    }
    next() {
        const char = this.peek();
        this.pos++;
        if (char == "\n") {
            this.lin++;
            this.col = 0;
        }
        else {
            this.col++;
        }
        return char;
    }
    peek(count = 0) {
        return this.input.charAt(this.pos + count);
    }
    eof() {
        return this.peek() == "";
    }
    croak(error) {
        return new Error(`[${this.line}:${this.col}] - ${error}`);
    }
    rewindTo(position) {
        this.rewind();
        while (this.pos < position) {
            this.next();
        }
    }
    rewind() {
        this.pos = 0;
        this.lin = 0;
        this.col = 0;
    }
}
exports.default = LexerStream;


/***/ }),

/***/ 925:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const DisplayLexer_1 = __importDefault(__webpack_require__(804));
class Display {
    static get instance() {
        if (Display._instance === null) {
            const elem = document.getElementById("main-display");
            if (elem === null)
                throw "#main-display not found";
            Display._instance = new DisplayInstance(elem);
        }
        return Display._instance;
    }
    static hookOut(io, ident = null) {
        io.hookOut(Display.instance, ident);
    }
}
exports.default = Display;
Display._instance = null;
class DisplayStyle {
    constructor() {
        this.f = null;
        this.b = null;
        this.s = null;
        this.r = null;
    }
    styleSpan(span) {
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
class DisplayInstance {
    constructor(elem) {
        this.column = 0;
        this.row = 0;
        this.data = [""];
        this.outHooks = [];
        this.colours = {};
        this.savedPos = [];
        this.container = elem;
        this.emptyElem(this.container);
        this.container.append(document.createElement("span"));
    }
    end(_input) {
        throw new Error("Method not implemented.");
    }
    hookOut(hook, ident) {
        this.outHooks.push([hook, ident]);
    }
    mapStyleNum(num) {
        let style = null;
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
    mapColour(c) {
        const colours = {
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
    mapColourType(c) {
        if (c >= 40 && c < 50)
            return "b";
        return "f";
    }
    addColour(row, column, col) {
        if (!this.colours.hasOwnProperty(`${row}`)) {
            this.colours[`${row}`] = {};
        }
        const style = this.colours[`${row}`][`${column}`] || new DisplayStyle();
        style.r = col;
        const cols = col.split(";");
        const colnum = parseInt(cols.pop() || "0");
        const stylnum = parseInt(cols.pop() || "0");
        const colour = this.mapColour(colnum);
        style.s = this.mapStyleNum(stylnum);
        if (this.mapColourType(colnum) == "b") {
            style.b = colour;
        }
        else {
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
    input(_input, _ident) {
        let input = "";
        if (_input instanceof Array) {
            input = _input.map(i => (i instanceof Array) ? i.join("\t") : i).join("\n");
        }
        else {
            input = _input;
        }
        const lines = this.writeInputToData(input);
        this.redrawLines(lines);
        this.container.scrollTop = this.container.scrollHeight;
    }
    output(output, ident) {
        this.outHooks.forEach(h => h[0].input(output, ident || h[1]));
    }
    emptyElem(elem) {
        while (elem.firstChild) {
            elem.removeChild(elem.firstChild);
        }
    }
    redrawLines(lines) {
        lines.sort();
        lines.forEach(l => {
            const line = this.data[l];
            this.drawLine(line, l);
        });
    }
    getLastDisplayStyleBefore(line) {
        let set = Object.entries(this.colours).map(v => {
            const entries = Object.entries(v[1]);
            return [parseInt(v[0]), entries.map(v => [parseInt(v[0]), v[1]])];
        });
        set = set.filter(v => v[0] < line);
        set = set.filter(v => v[1].length);
        set.sort((a, b) => b[0] - a[0]);
        ((set[0] || [])[1] || []).sort((a, b) => b[0] - a[0]);
        return (((set[0] || [])[1] || [])[0] || [])[1] || new DisplayStyle();
    }
    drawLine(line, index) {
        const row = this.container.children.item(index);
        if (row == null) {
            console.log("couldnt find row for", index, line);
            return;
        }
        const rowNum = this.data.length - 1 - this.row;
        let colNum = this.column < 0 ? this.data[rowNum].length - 1 : this.column;
        if (colNum < 0)
            colNum = 0;
        const colours = this.colours[index] || {};
        if (!colours.hasOwnProperty("0")) {
            colours["0"] = this.getLastDisplayStyleBefore(index);
        }
        const cols = Object.keys(colours).map(c => parseInt(c));
        let last = 0;
        const parts = [];
        cols.forEach(c => {
            if (c == 0)
                return;
            parts.push(line.substring(last, c));
            last = c;
        });
        parts.push(line.substring(last));
        this.emptyElem(row);
        if (index == rowNum) {
            const caretSpan = document.createElement("span");
            caretSpan.classList.add("caret-span");
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
    handleEscapeSequence(row, column, sequence) {
        let rowsAffected = [];
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
                if (this.column < 0)
                    this.column = 0;
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
            case "h":
                this.column = 0;
                this.row = this.data.length - 1;
                rowsAffected.push(row);
                rowsAffected.push(this.row);
                break;
            case "n":
                this.output(`\u001B[${row};${column}R`);
                break;
            case "s":
                this.savePos();
                break;
            case "u":
                rowsAffected.push(...this.restorePos());
                break;
            default:
                console.log("Unhandled Escape Sequence", sequence);
        }
        if (this.column < 0)
            this.column = 0;
        if (this.column > this.data[row].length)
            this.column = this.data[row].length;
        return rowsAffected;
    }
    savePos() {
        this.savedPos.push({ row: this.row, column: this.column });
    }
    restorePos() {
        const pos = this.savedPos.pop();
        const rowsAffected = [];
        if (pos) {
            rowsAffected.push(this.calcRowFromOffset());
            this.row = pos.row;
            this.column = pos.column;
            rowsAffected.push(this.calcRowFromOffset());
        }
        return rowsAffected;
    }
    handleSpecialChar(char) {
        const r = this.data.length - 1 - this.row;
        const row = this.data[r];
        let c = this.column < 0 ? this.data[r].length - 1 : this.column;
        if (c < 0)
            c = 0;
        const linesAffected = [];
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
                }
                else {
                    console.log("handle going back a line");
                }
                break;
            case "\u007F":
                if (row.length > 0) {
                    this.data[r] = row.substring(0, c) + row.substring(c + 1);
                    linesAffected.push(r);
                }
                else {
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
    writeInputToData(input) {
        const linesAffected = [];
        const lex = DisplayLexer_1.default.createFromString(input, [
            {
                s: /[\u001B]/, e: (ch, _n, i) => {
                    if (i == 0)
                        return false;
                    if (i == 1)
                        return ch != "[";
                    return /[\u0040-\u007E]/.test(ch);
                }
            },
            { s: /[\u0000-\u001A\u007F]/, e: null },
        ]);
        while (!lex.eof()) {
            const next = lex.next() || "";
            if (/[\u0000-\u001A\u007F]/.test(next[0] || "")) {
                linesAffected.push(...this.handleSpecialChar(next));
            }
            else {
                linesAffected.push(...this.handleChars(next));
            }
        }
        return [...new Set(linesAffected)];
    }
    calcRowFromOffset() {
        return this.data.length - 1 - this.row;
    }
    calcColumnFromOffset(row) {
        return this.column < 0 ? this.data[row].length - 1 : this.column;
    }
    handleChars(next) {
        const r = this.calcRowFromOffset();
        let c = this.calcColumnFromOffset(r);
        if (c < 0)
            c = 0;
        const linesAffected = [];
        switch (next[0] || "") {
            case "\u001B":
                linesAffected.push(...this.handleEscapeSequence(r, c, next));
                break;
            default:
                let row = this.data[r];
                if (this.column >= row.length || this.column < 0) {
                    row += next;
                }
                else {
                    row = row.substr(0, this.column) + next + row.substr(this.column + next.length);
                }
                this.column += next.length;
                this.data[r] = row;
                linesAffected.push(r);
                break;
        }
        return linesAffected;
    }
    beep() {
        var snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
        snd.play();
    }
}


/***/ }),

/***/ 14:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FileSystem = exports.FileSystemHandle = void 0;
const FSModels_1 = __webpack_require__(958);
const PathResolver_1 = __importDefault(__webpack_require__(268));
const _setItem = Storage.prototype.setItem;
const _getItem = Storage.prototype.getItem;
const _removeItem = Storage.prototype.removeItem;
Storage.prototype.setItem = (_key, _value) => {
    throw "Blocked";
};
Storage.prototype.getItem = (_key) => {
    throw "Blocked";
};
Storage.prototype.removeItem = (_key) => {
    throw "Blocked";
};
const _cache = {};
const setItem = (key, type, value) => {
    if (!_cache.hasOwnProperty(key))
        _cache[key] = { P: "", T: "" };
    _cache[key][type] = value;
    queueWrite();
};
const loadCache = () => {
    Object.keys(_cache).forEach(k => delete _cache[k]);
    const store = JSON.parse(_getItem.apply(window.localStorage, ["FS"]) || "{}");
    Object.entries(store).forEach(e => _cache[e[0]] = e[1]);
};
const getKeys = () => {
    return Object.keys(_cache);
};
let writeTick = null;
const queueWrite = () => {
    if (writeTick !== null) {
        window.clearTimeout(writeTick);
        writeTick = null;
    }
    writeTick = window.setTimeout(() => {
        _setItem.apply(window.localStorage, ["FS", JSON.stringify(_cache)]);
        writeTick = null;
    }, 5000);
};
const forceSaveCache = () => {
    if (writeTick != null) {
        window.clearTimeout(writeTick);
        writeTick = null;
    }
    _setItem.apply(window.localStorage, ["FS", JSON.stringify(_cache)]);
};
const getItem = (key, type) => {
    return (_cache[key] || {})[type] || null;
};
const removeItem = (key) => {
    if (_cache.hasOwnProperty(key)) {
        getKeys()
            .filter(k => k.startsWith(key + "/"))
            .forEach(k => removeItem(k));
        _cache[`!${key}`] = JSON.parse(JSON.stringify(_cache[key]));
        delete _cache[key];
    }
};
class FileSystemHandle {
    constructor(user) {
        this._cwd = "/";
        this.user = user;
        this.fs = new FileSystem();
    }
    clone(user) {
        user = user || this.user.clone();
        const fs = new FileSystemHandle(user);
        fs.setCwd(this.cwd);
        return fs;
    }
    write(path, data) {
        path = this.ensureFPath(path);
        if (this.exists(path)) {
            this.writeCheck(path);
        }
        else {
            this.touch(path);
        }
        this.fs.write(path, data);
    }
    append(path, data) {
        path = this.ensureFPath(path);
        this.writeCheck(path);
        this.fs.append(path, data);
    }
    prepend(path, data) {
        path = this.ensureFPath(path);
        this.writeCheck(path);
        this.fs.prepend(path, data);
    }
    mkdir(path) {
        path = this.ensureFPath(path);
        this.createCheck(path);
        this.fs.mkdir(path, new FSModels_1.FSAccess("755", this.user.name, this.user.name));
    }
    touch(path) {
        path = this.ensureFPath(path);
        this.createCheck(path);
        this.fs.touch(path, new FSModels_1.FSAccess("644", this.user.name, this.user.name));
    }
    read(path) {
        path = this.ensureFPath(path);
        this.readCheck(path);
        return this.fs.read(path) || "";
    }
    delete(path) {
        path = this.ensureFPath(path);
        this.writeCheck(path);
        this.fs.delete(path);
    }
    cp(from, to, force) {
        force = force || false;
        from = this.ensureFPath(from);
        to = this.ensureFPath(to);
        if (!force || !this.exists(to)) {
            this.createCheck(to);
        }
        else
            this.writeCheck(to);
        this.readCheck(from);
        this.fs.cp(from, to, this.user.name);
    }
    mv(from, to, force) {
        this.cp(from, to, force);
        this.delete(from);
    }
    resolve(path) {
        const p = PathResolver_1.default.resolve(path, this.cwd, this.user.name);
        return p;
    }
    abreviate(path) {
        path = this.ensureFPath(path);
        return PathResolver_1.default.abreviate(path.path, this.cwd, this.user.name);
    }
    createCheck(path) {
        if (!this.canRead(path.parent)) {
            throw `'${path.parent}' does not exist [CC]`;
        }
        if (!this.isDir(path.parent)) {
            throw `'${path.parent}' is not a directory [CC]`;
        }
        if (!this.canWrite(path.parent)) {
            throw `'${path.parent}' access denied [CC]`;
        }
        if (this.fs.exists(path)) {
            throw `${path} already exists [CC]`;
        }
    }
    writeCheck(path) {
        if (!this.fs.exists(path)) {
            this.touch(path);
        }
        if (!this.canWrite(path)) {
            throw `${path} access denied [WC]`;
        }
    }
    readCheck(path) {
        if (!this.canRead(path)) {
            throw `${path} access denied [RC]`;
        }
    }
    executeCheck(path) {
        if (!this.canExecute(path)) {
            throw `${path} is not executable [EC]`;
        }
    }
    canRead(path) {
        path = this.ensureFPath(path);
        if (path.isRoot)
            return true;
        if (!this.exists(path)) {
            console.log("READ NOT EXIST");
            return false;
        }
        return this.fs.getPerm(path).canRead(this.user);
    }
    canWrite(path) {
        path = this.ensureFPath(path);
        if (!this.exists(path)) {
            return false;
        }
        return this.fs.getPerm(path).canWrite(this.user);
    }
    canExecute(path) {
        path = this.ensureFPath(path);
        if (path.isRoot)
            return true;
        if (!this.exists(path)) {
            return false;
        }
        return this.fs.getPerm(path).canExecute(this.user);
    }
    exists(path) {
        path = this.ensureFPath(path);
        if (!this.fs.isType(path.parent, FSModels_1.FSType.dir)) {
            console.log("EXISTS PARENT NOT DIR");
            return false;
        }
        const perm = this.fs.getPerm(path.parent);
        if (!perm.canRead(this.user)) {
            console.log(`EXISTS PARENT NOT PERM ${perm}`);
            return false;
        }
        return this.fs.exists(path);
    }
    isDir(path) {
        path = this.ensureFPath(path);
        return this.isType(path, FSModels_1.FSType.dir);
    }
    ensureFPath(path) {
        if (typeof path === "string")
            path = new FSModels_1.FPath(path, this.cwd, this.user.name);
        return path;
    }
    isFile(path) {
        path = this.ensureFPath(path);
        return this.isType(path, FSModels_1.FSType.file);
    }
    isType(path, type) {
        if (!this.exists(path))
            return false;
        path = this.ensureFPath(path);
        this.readCheck(path);
        return this.fs.getType(path) == type;
    }
    get cwd() {
        return this._cwd;
    }
    setCwd(path) {
        path = this.ensureFPath(path);
        if (!this.canExecute(path)) {
            throw `${path} access denied`;
        }
        if (!this.isDir(path)) {
            throw `${path} is not a directory`;
        }
        this._cwd = path.path;
        this.user.setEnv("cwd", path.path);
        this.user.setEnv("cwd_short", this.abreviate(path));
    }
    chmod(path, perm) {
        path = this.ensureFPath(path);
        this.writeCheck(path);
        const access = this.fs.getPerm(path);
        access.setPerm(perm);
        this.fs.setPerm(path, access);
    }
    chown(path, owner, group) {
        path = this.ensureFPath(path);
        this.writeCheck(path);
        const access = this.fs.getPerm(path);
        access.setOwner(owner);
        access.setGroup(group || access.group);
        this.fs.setPerm(path, access);
    }
    list(path, trim = false) {
        const fpath = this.ensureFPath(path);
        this.executeCheck(fpath);
        let items = this.fs.list(fpath);
        items = items.filter(i => this.canRead(i));
        if (trim) {
            items = items.map(key => trim ? key.substr(fpath.path.length + (fpath.path == "/" ? 0 : 1)) : key);
        }
        return items;
    }
    getPerm(path) {
        path = this.ensureFPath(path);
        this.readCheck(path);
        return this.fs.getPerm(path);
    }
}
exports.FileSystemHandle = FileSystemHandle;
class FileSystem {
    mkdir(path, perm) {
        this.setType(path, FSModels_1.FSType.dir);
        this.setPerm(path, perm);
    }
    touch(path, perm, data) {
        this.setType(path, FSModels_1.FSType.file);
        this.setPerm(path, perm);
        this.write(path, data || "");
    }
    setType(path, type) {
        setItem(path.path, "T", type);
    }
    setPerm(path, perm) {
        setItem(path.path, "P", perm.toString());
    }
    isType(path, type) {
        return this.getType(path) == type;
    }
    getType(path) {
        const t = getItem(path.path, "T") || "";
        return FSModels_1.FSType[t] || null;
    }
    read(path) {
        const t = this.getType(path);
        let v = getItem(path.path, "D");
        if (t == FSModels_1.FSType.link) {
            v = getItem(v + "", "D");
        }
        return v;
    }
    write(path, data) {
        const t = this.getType(path);
        let p = path.path;
        if (t == FSModels_1.FSType.link) {
            p = getItem(p, "D") || p;
        }
        setItem(p, "D", data);
        const perm = this.getPerm(path);
        perm.modifyTime = (Date.now() / 1000 | 0);
        this.setPerm(path, perm);
    }
    delete(path) {
        const t = this.getType(path);
        if (t !== null) {
            removeItem(path.path);
        }
    }
    append(path, data) {
        this.write(path, (this.read(path) || "") + data);
    }
    prepend(path, data) {
        this.write(path, data + (this.read(path) || ""));
    }
    exists(path) {
        return this.getType(path) != null;
    }
    cp(from, to, user) {
        const type = this.getType(from);
        const perm = this.getPerm(from);
        perm.setOwner(user);
        perm.setGroup(user);
        if (type == FSModels_1.FSType.file || type == FSModels_1.FSType.link) {
            const data = this.read(from);
            this.touch(to, perm, data || "");
        }
        else if (type == FSModels_1.FSType.dir) {
            this.mkdir(to, perm);
        }
    }
    getPerm(path) {
        const str = getItem(path.path, "P") || "";
        const perm = FSModels_1.FSAccess.fromAccessString(str);
        if (perm.accessUndefined) {
            this.setPerm(path, perm);
        }
        return perm;
    }
    list(path, _deleted = false) {
        return getKeys()
            .filter(key => key.startsWith(path.path + (path.path == "/" ? "" : "/")) && key.length > path.path.length)
            .filter(key => !key.substr(path.path.length + (path.path == "/" ? 0 : 1)).includes("/"));
    }
    static async boot() {
        const permRoot = new FSModels_1.FSAccess("755", "root", "root");
        loadCache();
        (new FileSystem()).mkdir(new FSModels_1.FPath("/", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FSModels_1.FPath("/bin", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FSModels_1.FPath("/home", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FSModels_1.FPath("/home/guest", "/", "root"), new FSModels_1.FSAccess("755", "guest", "guest"));
        (new FileSystem()).mkdir(new FSModels_1.FPath("/home/wolfgang", "/", "root"), new FSModels_1.FSAccess("755", "wolfgang", "wolfgang"));
        (new FileSystem()).mkdir(new FSModels_1.FPath("/root", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FSModels_1.FPath("/etc", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FSModels_1.FPath("/etc/shell", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FSModels_1.FPath("/usr", "/", "root"), permRoot);
        (new FileSystem()).mkdir(new FSModels_1.FPath("/usr/bin", "/", "root"), permRoot);
        window.onbeforeunload = () => {
            forceSaveCache();
        };
    }
}
exports.FileSystem = FileSystem;


/***/ }),

/***/ 221:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
class Process {
    constructor(pid, system, binary, args, parent = null) {
        var _a;
        this._parent = null;
        this._pid = pid;
        this._system = system;
        this._binary = binary;
        this._parent = parent;
        this.args = args;
        try {
            this._instance = new this._binary(this);
        }
        catch (e) {
            (_a = this.parent) === null || _a === void 0 ? void 0 : _a.input("\u001B[31mError\u001B[0m: Failed to start process", "error");
            this._instance = new DummyProc();
        }
    }
    kill() {
        var _a;
        (_a = this.instance) === null || _a === void 0 ? void 0 : _a.kill();
        this._instance = null;
    }
    end(input) {
        var _a;
        (_a = this._instance) === null || _a === void 0 ? void 0 : _a.end(input);
        this._instance = null;
    }
    hookOut(hook, ident = null) {
        var _a;
        (_a = this.instance) === null || _a === void 0 ? void 0 : _a.hookOut(hook, ident);
    }
    input(input, ident = null) {
        var _a;
        (_a = this.instance) === null || _a === void 0 ? void 0 : _a.input(input, ident);
    }
    get system() {
        return this._system;
    }
    get user() {
        return this.system.user;
    }
    get pid() {
        return this._pid;
    }
    get instance() {
        return this._instance;
    }
    get parent() {
        return this._parent;
    }
    get fileSystem() {
        return this.system.fileSystem;
    }
    run() {
        var _a;
        const out = (_a = this.instance) === null || _a === void 0 ? void 0 : _a.run(this.args);
        return out || Promise.reject("INSTANCE FAILE");
    }
    createProcess(location, args) {
        let bin = null;
        let loc = this.fileSystem.resolve(location);
        if (this.fileSystem.exists(loc)) {
            if (location.startsWith("/") || location.startsWith("./") || location.startsWith("~")) {
                bin = this.fileSystem.read(loc);
            }
        }
        if (bin === null) {
            loc = this.getBinPath(location);
            if (loc != null) {
                bin = this.fileSystem.read(loc);
            }
        }
        if (bin == null || loc == null)
            throw `${location} is not a recognized program\n`;
        if (!this.fileSystem.canExecute(loc))
            throw `${loc} is not executable\n`;
        const first = bin.split("\n")[0];
        if (first.startsWith("#!")) {
            const handler = first.substr(2).trim().split(" ");
            const app = handler.shift() || "";
            if (app.length > 0 && app != "iProcessInstance") {
                return this.createProcess(app, [...handler, "-s", loc, ...args]);
            }
        }
        const proc = this.system.createProcess(bin, args, this);
        return proc;
    }
    getBinPath(name) {
        const paths = this.getAvailablePrograms();
        const path = paths.find(v => v[1].includes(name)) || null;
        if (path == null)
            return path;
        return path[0] + "/" + name;
    }
    getAvailablePrograms() {
        const path = (this.user.getEnv("path") || "/bin").split(";");
        return path.map(p => [p, this.fileSystem.list(p, true)]);
    }
    log(...args) {
        console.log(`Proc[${this.pid}]: `, ...args);
    }
}
exports.default = Process;
class DummyProc {
    end(_input) {
        throw new Error("Method not implemented.");
    }
    run(_args) {
        return Promise.resolve("");
    }
    kill() {
    }
    hookOut(_hook, _ident) {
    }
    input(_input, _ident) {
    }
}


/***/ }),

/***/ 978:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.System = exports.SystemHandle = void 0;
const UserIdent_1 = __webpack_require__(895);
const FileSystem_1 = __webpack_require__(14);
const Display_1 = __importDefault(__webpack_require__(925));
const Process_1 = __importDefault(__webpack_require__(221));
class SystemHandle {
    constructor(user, fs = null) {
        this._user = user;
        this.fs = fs || new FileSystem_1.FileSystemHandle(this.user);
    }
    get user() {
        return this._user;
    }
    get fileSystem() {
        return this.fs;
    }
    clone() {
        const user = this.user.clone();
        const fs = this.fs.clone(user);
        return new SystemHandle(user, fs);
    }
    debug(key, value) {
        System.debug(key, value);
    }
    get isDebug() {
        return System.isDebug;
    }
    createSystemHandle(name, pass = null) {
        if (name == this.user.name)
            return new SystemHandle(this.user);
        const root = new UserIdent_1.UserIdent("root", ["root"]);
        const fs = new FileSystem_1.FileSystemHandle(root);
        const shadow = fs.read("/etc/shadow").split("\n");
        const line = (shadow.find(item => item.startsWith(name)) || "").split(":");
        if (line.length > 1) {
            if (line[1] == pass) {
                const user = new UserIdent_1.UserIdent(name, [name]);
                return new SystemHandle(user);
            }
        }
        throw "User Not found";
    }
    createProcess(bin, args, creator) {
        return System.createProcess(bin, this, args, creator);
    }
}
exports.SystemHandle = SystemHandle;
const EVAL = window.eval;
window.eval = (...args) => console.log("Eval Attempted", args);
class System {
    static debug(key, value) {
        if (value == null) {
            if (System._debug.hasOwnProperty(key)) {
                delete System._debug[key];
            }
        }
        else {
            System._debug[key] = value;
        }
        const pre = document.getElementById("debug");
        if (pre instanceof HTMLElement) {
            pre.textContent = JSON.stringify(System._debug, null, 2);
        }
    }
    static get isDebug() {
        return System.debugging;
    }
    static toggleDebug() {
        System.debugging = !System.debugging;
        const pre = document.getElementById("debug");
        if (pre instanceof HTMLElement) {
            pre.style.display = System.isDebug ? "block" : "none";
        }
    }
    static createProcess(bin, system, args, creator) {
        let next = null;
        try {
            next = EVAL(bin).default || null;
        }
        catch (e) {
            throw e.toString() + "\n";
        }
        System.processCount++;
        return new Process_1.default(System.processCount, system.clone(), next, args, creator);
    }
    static setup(system) {
        if (system.fileSystem.isFile("/etc/version_hash")) {
            System.rootHash = (system.fileSystem.read("/etc/version_hash") || "").trim();
        }
        if (System.isDev)
            System.toggleDebug();
        return System.loadRoot(system, () => true, true)
            .then(() => {
            if (System.isDev) {
                window.setInterval(() => System.loadRoot(system, (s) => s.startsWith("/bin/")), 10000);
            }
        });
    }
    static async loadRoot(system, filter, output = false) {
        const response = await fetch("root.json");
        const fjson = await response.json();
        if (fjson == null)
            throw "root json is null";
        const hash = fjson.hash || null;
        if (System.rootHash == hash)
            return;
        console.log("Hash Change: ", System.rootHash, "to", hash);
        System.rootHash = hash;
        const json = fjson.fs || null;
        if (json == null)
            throw "root fs json is null";
        if (output)
            Display_1.default.instance.input("Installing...\n", "setup");
        for (const e of Object.entries(json)) {
            const path = e[0];
            if (!filter(path))
                return;
            const file = e[1] || null;
            if (typeof file == "object" && file != null && file.hasOwnProperty("content")) {
                if (output)
                    Display_1.default.instance.input(`\t${path}...`, "setup");
                const len = Math.floor(`${path}...`.length / 8);
                if (!system.fileSystem.exists(path) && !System.isDev) {
                    await (new Promise(res => window.setTimeout(() => res(0), 200)));
                }
                system.fileSystem.write(path, file["content"] || "");
                const perms = (file["perm"] || "root:root:0755").split(":");
                system.fileSystem.chmod(path, perms[2] || "755");
                system.fileSystem.chown(path, perms[0] || "root", perms[1] || "root");
                if (output)
                    Display_1.default.instance.input(`${(new Array(5 - len)).join("\t")}\u001B[32mDone\u001B[0m\n`, "setup");
            }
            else {
                console.log(e);
            }
        }
        system.fileSystem.write("/etc/version_hash", `${hash}\n`);
        console.groupEnd();
        if (output) {
            if (!System.isDev) {
                Display_1.default.instance.input("Complete!!!", "setup");
                await (new Promise(res => window.setTimeout(() => res(0), 1000)));
            }
            Display_1.default.instance.input("\u001B[J", "setup");
        }
    }
    static get isDev() {
        return location.hostname == "127.0.0.1";
    }
    static async boot() {
        await FileSystem_1.FileSystem.boot();
        const root = new UserIdent_1.UserIdent("root", ["root"]);
        const rootSysHandle = new SystemHandle(root);
        document.onkeypress = ev => {
            System.keyInput(ev.key);
            return false;
        };
        document.onkeydown = ev => {
            switch (ev.key) {
                case "Backspace":
                case "Tab":
                case "ArrowUp":
                case "ArrowDown":
                case "ArrowLeft":
                case "ArrowRight":
                case "Home":
                case "End":
                case "Delete":
                    System.keyInput(ev.key);
                    return false;
                case "c":
                    if (ev.ctrlKey && !ev.altKey && !ev.shiftKey) {
                        System.keyInput("\u0018");
                        return false;
                    }
                case "a":
                    if (ev.ctrlKey)
                        return false;
                    break;
                case "d":
                    if (ev.ctrlKey && ev.altKey) {
                        System.toggleDebug();
                        return false;
                    }
                case "Alt":
                case "Shift":
                case "Control":
                    break;
                default:
                    break;
            }
        };
        System.setup(rootSysHandle)
            .then(() => {
            const shell = rootSysHandle.fileSystem.read("/bin/shell");
            const guest = new UserIdent_1.UserIdent("guest", ["guest"]);
            const guestSysHandle = new SystemHandle(guest);
            guestSysHandle.fileSystem.setCwd("~");
            const proc = System.createProcess(shell, guestSysHandle, ["--motd"], null);
            Display_1.default.hookOut(proc);
            System.hookInput(proc);
            return proc.run();
        })
            .then(() => {
            console.log("out");
        }).catch(_e => {
            const disp = document.getElementById("main-display");
            while (disp === null || disp === void 0 ? void 0 : disp.firstChild) {
                disp.removeChild(disp.firstChild);
            }
            console.log(_e);
        });
    }
    static hookInput(input) {
        System.inputHooks.push(input);
    }
    static keyInput(ev) {
        System.inputHooks.forEach(hook => hook.input(ev, "user"));
    }
}
exports.System = System;
System.processCount = 0;
System.inputHooks = [];
System.rootHash = "";
System.debugging = false;
System._debug = {};


/***/ }),

/***/ 895:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserIdent = void 0;
class UserIdent {
    constructor(name, groups, env) {
        this._env = env || new UserEnv();
        this._name = name;
        this._groups = groups;
    }
    get name() {
        return this._name;
    }
    get groups() {
        return [...this._groups];
    }
    get env() {
        return this._env.vars;
    }
    getEnv(key) {
        key = key.toUpperCase().trim();
        if (key == "USER")
            return this.name;
        return this.env[key] || null;
    }
    setEnv(key, value) {
        key = key.toUpperCase().trim();
        this.env[key] = value;
    }
    listEnv() {
        return Object.entries(this.env);
    }
    remEnv(key) {
        key = key.toUpperCase().trim();
        if (this.env.hasOwnProperty(key)) {
            delete this.env[key];
        }
    }
    clone() {
        const user = new UserIdent(this.name, this.groups, this._env);
        return user;
    }
}
exports.UserIdent = UserIdent;
class UserEnv {
    constructor() {
        this.vars = {
            "PATH": "/bin"
        };
    }
}


/***/ }),

/***/ 804:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const LexerStream_1 = __importDefault(__webpack_require__(93));
class DisplayLexer {
    constructor(input, tokes) {
        this.tokes = [];
        this.input = input;
        this.tokes = tokes;
    }
    static createFromString(input, tokes) {
        return new DisplayLexer(new LexerStream_1.default(input), tokes);
    }
    all() {
        this.rewind();
        let next = this.next();
        const all = [];
        while (next != null) {
            all.push(next);
            next = this.next();
        }
        return all;
    }
    eof() {
        return this.input.eof();
    }
    rewind() {
        this.input.rewind();
    }
    next() {
        if (this.input.eof())
            return null;
        if (this.nextIsStarter()) {
            return this.readToken();
        }
        else {
            return this.input.next();
        }
    }
    nextIsStarter() {
        return this.isStarter(this.input.peek());
    }
    isStarter(s) {
        return this.tokes.some(t => t.s.test(s));
    }
    readToken() {
        const ch = this.input.peek();
        const toke = this.tokes.find(t => t.s.test(ch)) || null;
        if (toke == null) {
            throw new Error("WAT");
        }
        const end = toke.e;
        if (end == null) {
            return this.input.next();
        }
        else {
            return this.readUntil(end);
        }
    }
    readUntil(func) {
        let str = "";
        let i = 0;
        while (!this.input.eof()) {
            const s = this.input.next();
            str += s;
            if (func(s, this.input.peek(), i))
                break;
            i++;
        }
        return str;
    }
}
exports.default = DisplayLexer;


/***/ }),

/***/ 958:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FPath = exports.FSAccess = exports.FSType = exports.FSPerm = void 0;
const PathResolver_1 = __importDefault(__webpack_require__(268));
var FSPerm;
(function (FSPerm) {
    FSPerm[FSPerm["execute"] = 1] = "execute";
    FSPerm[FSPerm["write"] = 2] = "write";
    FSPerm[FSPerm["read"] = 4] = "read";
})(FSPerm = exports.FSPerm || (exports.FSPerm = {}));
var FSType;
(function (FSType) {
    FSType["file"] = "file";
    FSType["dir"] = "dir";
    FSType["in"] = "in";
    FSType["out"] = "out";
    FSType["link"] = "link";
})(FSType = exports.FSType || (exports.FSType = {}));
class FSAccess {
    constructor(perm, owner, group, accessTime, modifyTime, changeTime, createTime) {
        this.perms = {
            user: 0,
            group: 0,
            other: 0,
        };
        this.accessUndefined = false;
        this.setPerm(perm);
        this._owner = owner;
        this._group = group;
        if (accessTime === undefined)
            this.accessUndefined = true;
        this.accessTime = accessTime || (Date.now() / 1000 | 0);
        this.modifyTime = modifyTime || (Date.now() / 1000 | 0);
        this.changeTime = changeTime || (Date.now() / 1000 | 0);
        this.createTime = createTime || (Date.now() / 1000 | 0);
    }
    get permString() {
        return `0${this.perms.user}${this.perms.group}${this.perms.other}`;
    }
    get longPermString() {
        return [
            this.permToLongString(this.perms.user),
            this.permToLongString(this.perms.group),
            this.permToLongString(this.perms.other),
        ].join("");
    }
    permToLongString(perm) {
        return [
            this.permTest(perm, FSPerm.read) ? "r" : "-",
            this.permTest(perm, FSPerm.write) ? "w" : "-",
            this.permTest(perm, FSPerm.execute) ? "x" : "-",
        ].join("");
    }
    static fromAccessString(str) {
        const parts = str.split(":");
        if (parts.length > 3) {
            return new FSAccess(parts[2], parts[0], parts[1], parseInt(parts[3]) || undefined, parseInt(parts[4]) || undefined, parseInt(parts[5]) || undefined, parseInt(parts[6]) || undefined);
        }
        else if (parts.length == 3) {
            return new FSAccess(parts[2], parts[0], parts[1]);
        }
        throw "Invalid Access String: " + str;
    }
    get owner() {
        return this._owner;
    }
    get group() {
        return this._group;
    }
    setOwner(owner) {
        this._owner = owner;
    }
    setGroup(group) {
        this._group = group;
    }
    setPerm(perm) {
        if (!/^[0-7]{3,4}$/.test(perm))
            throw "perm must be in 777 or 0777 format";
        this.perms.other = parseInt(perm.substr(perm.length - 1, 1));
        this.perms.group = parseInt(perm.substr(perm.length - 2, 1));
        this.perms.user = parseInt(perm.substr(perm.length - 3, 1));
    }
    toString() {
        return `${this.owner}:${this.group}:${this.permString}:${this.accessTime}:${this.modifyTime}:${this.changeTime}:${this.createTime}`;
    }
    getUserLevel(user) {
        if (this.owner == user.name || user.name == "root")
            return "user";
        if (user.groups.includes(this.group))
            return "group";
        return "other";
    }
    canRead(user) {
        return this.userHasPerm(user, FSPerm.read);
    }
    canWrite(user) {
        return this.userHasPerm(user, FSPerm.write);
    }
    canExecute(user) {
        return this.userHasPerm(user, FSPerm.execute);
    }
    userHasPerm(user, perm) {
        switch (this.getUserLevel(user)) {
            case "user":
                if (this.permTest(this.perms.user, perm))
                    return true;
            case "group":
                if (this.permTest(this.perms.group, perm))
                    return true;
            case "other":
                if (this.permTest(this.perms.other, perm))
                    return true;
            default:
                return false;
        }
    }
    permTest(perm, test) {
        const testPerm = parseInt(test);
        return (perm & testPerm) > 0;
    }
}
exports.FSAccess = FSAccess;
class FPath {
    constructor(path, cwd, username) {
        this._parent = null;
        this.cwd = cwd;
        this.username = username;
        this._path = PathResolver_1.default.resolve(path, cwd, username);
    }
    get parent() {
        if (this._parent === null) {
            this._parent = new FPath(PathResolver_1.default.parent(this.path), this.cwd, this.username);
        }
        return this._parent;
    }
    get path() {
        return this._path;
    }
    get isRoot() {
        return this.path === "/";
    }
    toString() {
        return this.path;
    }
    get parentList() {
        if (this.isRoot)
            return [];
        let parent = this.parent;
        const parents = [parent];
        while (!parent.isRoot) {
            parent = parent.parent;
            parents.unshift(parent);
        }
        return parents;
    }
}
exports.FPath = FPath;


/***/ }),

/***/ 268:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
class PathResolver {
    static parent(name) {
        const parts = name.split("/");
        parts.pop();
        return parts.join("/");
    }
    static resolve(name, cwd, username) {
        const parts = name.split("/");
        if ((parts[0] || "") == "~") {
            parts.shift();
            parts.unshift(username);
            if (username != "root") {
                parts.unshift("home");
            }
            parts.unshift("");
        }
        if (parts[0] != "") {
            cwd.split("/").reverse().forEach(p => parts.unshift(p));
        }
        const out = [];
        parts.forEach(p => {
            if (p == ".")
                return;
            else if (p == "..")
                out.pop();
            else
                out.push(p);
        });
        return "/" + out.filter(i => i.length > 0).join("/");
    }
    static abreviate(path, cwd, username) {
        path = PathResolver.resolve(path, cwd, username);
        if (username == "root") {
            if (path.startsWith("/root/") || path == "/root") {
                path = "~" + path.substr("/root".length);
            }
        }
        else if (path.startsWith(`/home/${username}/`) || path == `/home/${username}`) {
            path = "~" + path.substr(`/root/${username}`.length);
        }
        return path;
    }
}
exports.default = PathResolver;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
const System_1 = __webpack_require__(978);
(() => {
    const ready = (fn) => {
        if (document.readyState != 'loading') {
            fn();
        }
        else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    };
    ready(() => System_1.System.boot());
})();

})();

/******/ })()
;