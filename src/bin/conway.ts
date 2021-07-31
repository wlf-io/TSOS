import EscapeCodes from "../shared/EscapeCodes";
import BaseApp from "./base/base";

export default class conway extends BaseApp {

    private frames: number = 100;

    private gridSizeX = 50;

    private gridSizeY = 50;

    private dataFile: string | null = null;

    private sleep: number = 10;

    private random: boolean = false;

    private teams: number = 1;

    protected handleFlag(flag: string, arg: string): boolean {
        switch (flag.toLowerCase()) {
            case "g":
                this.gridSizeX = parseInt(arg || "50") || 50;
                this.gridSizeY = this.gridSizeX;
                return true;
            case "y":
                this.gridSizeY = parseInt(arg || "50") || 50;
                return true;
            case "x":
                this.gridSizeX = parseInt(arg || "50") || 50;
                return true;
            case "d":
                this.dataFile = arg;
                return true;
            case "f":
                this.frames = parseInt(arg || "100") || 100;
                return true;
            case "s":
                this.sleep = parseInt(arg || "10");
                if (this.sleep == NaN) this.sleep = 10;
                return true;
            case "t":
                this.teams = parseInt(arg || "1");
                if (this.teams == NaN) this.teams = 1;
                return true;
            case "r":
                this.random = true;
                break;
        }
        return false;
    }

    private buildGrid(sizeY: number, sizeX: number): ConwayGrid {
        const grid: ConwayGrid = [];
        let y = 0;
        for (y = 0; y < sizeY; y++) {
            grid[y] = [];
            let x = 0;
            for (x = 0; x < sizeX; x++) {
                grid[y][x] = 0;
            }
        }
        return grid;
    }

    private setGlider(grid: ConwayGrid) {
        grid[3][3] = 1;
        grid[4][4] = 1;
        grid[5][2] = 1;
        grid[5][3] = 1;
        grid[5][4] = 1;
    }
    private readFileToGrid(file: string, grid: ConwayGrid) {
        file = this.fs.read(file);
        const lines = file.split("\n").map(l => l.trim().split(/[ \t]+/).filter(l => l.length)).filter(l => l.length == 2);
        for (const line of lines) {
            const y = parseInt(line[0] || "0") || 0;
            const x = parseInt(line[1] || "0") || 0;
            if (y < 0 || y >= grid.length) continue;
            const row = grid[y];
            if (x < 0 || x >= row.length) continue;
            row[x] = 1;
        }
    }

    private randomizeGrid(grid: ConwayGrid) {
        for (let y = 0; y < grid.length; y++) {
            const row = grid[y];
            for (let x = 0; x < row.length; x++) {
                row[x] = Math.floor(Math.random() * (this.teams + 1));
            }
        }
    }

    public async start(_args: string[]) {
        let grid: ConwayGrid = this.buildGrid(this.gridSizeY, this.gridSizeX);

        if (this.dataFile) {
            this.readFileToGrid(this.dataFile, grid);
        } else if (this.random) {
            this.randomizeGrid(grid);
        } else {
            this.setGlider(grid);
        }


        while (this.frames-- > 0) {
            this.outputGrid(grid);
            grid = await this.conway(grid)
            await (new Promise(res => window.setTimeout(() => res(1), this.sleep)));
        }
        this.end("");
    }

    private outputGrid(grid: ConwayGrid) {
        let str = `${EscapeCodes.ESC}[J${this.frames}\n`;

        for (const row of grid) {
            for (const col of row) {

                str += this.colourise(col ? "▓▓" : "░░", col);
            }
            str += "\n";
        }
        this.output(str);
    }

    private colourise(str: string, team: number) {
        if (this.teams == 1) return str;
        let col = 0;
        switch (team) {
            case 1:
                col = 31;
                break;
            case 2:
                col = 34;
                break;
            case 3:
                col = 32;
                break;
            case 4:
                col = 33;
                break;
        }
        return `${EscapeCodes.ESC}[${col}m${str}`;
    }

    private async conway(grid: ConwayGrid): Promise<ConwayGrid> {
        const nextGrid = this.buildGrid(this.gridSizeY, this.gridSizeX);

        for (let y = 0; y < grid.length; y++) {
            const row = grid[y];
            for (let x = 0; x < row.length; x++) {
                const cell = row[x];
                const surround = this.sumSurround(grid, y, x);
                let next = cell;
                if (cell) {
                    if (surround.teamCount(cell) > 3 || surround.teamCount(cell) < 2) next = 0;
                } else {
                    next = surround.has3();
                }

                nextGrid[y][x] = next;
            }
        }

        return nextGrid;
    }

    private sumSurround(grid: ConwayGrid, y: number, x: number): Surround {
        const surround = new Surround();
        for (const yo of [-1, 0, 1]) {
            for (const xo of [-1, 0, 1]) {
                if (xo == 0 && yo == 0) continue;
                const cell = this.getGridCell(grid, y + yo, x + xo);
                if (cell) surround.push(cell);
            }
        }
        return surround;
    }

    private getGridCell(grid: ConwayGrid, y: number, x: number): number {
        while (y < 0) y += grid.length;
        while (y >= grid.length) y -= grid.length;
        const row = grid[y];
        while (x < 0) x += row.length;
        while (x >= row.length) x -= row.length;
        return row[x];
    }


}

class Surround {
    public cells: number[] = [];
    public count: { [k: string]: number } = {};

    public teamCount(team: number): number {
        return this.count[team] || 0;
    }

    public has3(): number {
        if (this.cells.length == 3) {
            const t = Object.keys(this.count);
            if (t.length == 1) return parseInt(t[0]);
            if (t.length == 3) return parseInt(t[Math.floor(Math.random() * 3)]);
            return parseInt(this.count[t[0]] > this.count[t[1]] ? t[0] : t[1]);
        }
        return 0;
    }

    public push(c: number) {
        this.cells.push(c);
        this.count[c] = (this.count[c] || 0) + 1;
    }
}


type ConwayGrid = number[][];
