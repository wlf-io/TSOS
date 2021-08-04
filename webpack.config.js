const path = require("path");
const { readFile, readdir, writeFile } = require("fs").promises;
const crypto = require("crypto");

const deepFiles = async function*(dir) {
    const children = await readdir(dir, { withFileTypes: true });
    for (const child of children) {
        const p = path.resolve(dir, child.name);
        if (child.isDirectory()) {
            yield* deepFiles(p);
        } else {
            const content = await readFile(p, "utf-8");
            yield [p, content];
        }
    }
};

const fixBins = (bin, path) => {
    path = path.split("/");
    path = path.pop();
    bin = bin.replace(`//# sourceMappingURL=${path}.map`, `//# sourceMappingURL=/root/bin/${path}.map`);
    bin = bin.replace('var __webpack_exports__ =', 'return');
    return "#!iProcessInstance\n" + bin;
};


const getBinEntries = async() => {
    const children = await readdir(path.resolve(__dirname, "src/bin"), { withFileTypes: true });
    const entries = {};
    for (const child of children) {
        if (child.isDirectory()) continue;
        const p = path.resolve(__dirname, "src/bin", child.name);
        entries[child.name.split(".ts").shift()] = p;
    }
    return entries;
}

const getDirEntriesFunc = (dir) => {
    const func = async() => {
        const children = await readdir(path.resolve(__dirname, dir), { withFileTypes: true });
        const entries = {};
        for (const child of children) {
            if (child.isDirectory()) continue;
            if (!child.name.endsWith(".ts")) continue;
            const p = path.resolve(__dirname, dir, child.name);
            entries[child.name.split(".ts").shift()] = p;
        }
        return entries;
    };
    return func;
}

const config = {
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: [{
                loader: "ts-loader",
                options: {
                    configFile: "tsconfig.json"
                }
            }],
            exclude: /node_modules/
        }]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
}

module.exports = env => {
    env.map = JSON.parse(env.map);
    return [
        Object.assign({}, config, {
            entry: {
                system: './src/system/root.ts',
            },
            output: {
                filename: "[name].js",
                path: path.resolve(__dirname, "dist"),
            },
            optimization: {
                minimize: false,
            },
            devtool: env.map ? "source-map" : undefined,
        }),
        Object.assign({}, config, {
            entry: getDirEntriesFunc("src/lib"),
            output: {
                filename: "[name].js",
                path: path.resolve(__dirname, "dist/root/lib"),
            },
            optimization: {
                minimize: false,
            },
            devtool: env.map ? "source-map" : undefined,
        }),
        Object.assign({}, config, {
            entry: getDirEntriesFunc("src/bin"),
            output: {
                filename: "[name].js",
                path: path.resolve(__dirname, "dist/root/bin"),
            },
            plugins: [{
                apply: (compiler) => {
                    compiler.hooks.afterEmit.tap(
                        "JsonBinPlugin",
                        async(compilation) => {
                            console.log(env);
                            const root = path.resolve(__dirname, "dist/root");
                            let json = "{}"
                            try {
                                json = await readFile(path.resolve(__dirname, "root.json"), "utf-8");
                            } catch (e) {
                                console.log(e);
                            }
                            const fs = JSON.parse(json);
                            for await (const f of deepFiles(root)) {
                                const [p, content] = f;
                                if (p.endsWith(".map")) continue;
                                const r = (p.split(root)[1] || "").split("\\").join("/");
                                const bin = r.endsWith(".js");
                                const n = bin ? r.substring(0, r.length - 3) : r;
                                fs[n] = fs[n] || {};
                                fs[n]["content"] = (bin ? fixBins(content, r) : content).split("\r\n").join("\n");
                                fs[n]["perm"] = fs[n]["perm"] || ("root:root:0" + (bin ? 755 : 644).toString());
                                fs[n]["hash"] = crypto.createHash("sha256").update(fs[n]["content"]).digest("hex");
                            }
                            const fsset = Object.entries(fs).map(f => f[1]["hash"]);
                            fsset.sort();
                            const sys = await readFile(path.resolve(__dirname, "dist/system.js"));
                            const sysHash = crypto.createHash("sha256").update(sys).digest("hex");
                            const hash = crypto.createHash("sha256").update(sysHash + fsset.join("")).digest("hex");
                            await writeFile(path.resolve(__dirname, "dist/root.json"), JSON.stringify({ fs, sysHash, hash }, null, 2));
                        }
                    )
                }
            }],
            optimization: {
                minimize: false,
            },
            devtool: env.map ? "source-map" : undefined,
        }),
    ];
};