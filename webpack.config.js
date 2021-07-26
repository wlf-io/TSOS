const path = require("path");
const { readFile, readdir, writeFile } = require("fs").promises;

const deepFiles = async function* (dir) {
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
    bin = bin.replace(`//# sourceMappingURL=${path}.map`, `//# sourceMappingURL=/root/bin/${path}.map`);
    bin = bin.replace('var __webpack_exports__ =', 'return');
    return bin;
};


const config = {
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [{
                    loader: "ts-loader",
                    options: {
                        configFile: "tsconfig.json"
                    }
                }],
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    optimization: {
        minimize: false
    },
    devtool: "source-map",
}

module.exports = [
    Object.assign({}, config, {
        entry: {
            system: './src/system/root.ts',
        },
        output: {
            filename: "[name].js",
            path: path.resolve(__dirname, "dist"),
        },
    }),
    Object.assign({}, config, {
        entry: {
            shell: './src/bin/shell.ts',
            ls: './src/bin/ls.ts',
            mkdir: './src/bin/mkdir.ts',
            rm: './src/bin/rm.ts',
            cd: './src/bin/cd.ts',
            touch: './src/bin/touch.ts',
            cat: './src/bin/cat.ts',
            pwd: './src/bin/pwd.ts',
            hostname: './src/bin/hostname.ts',
            echo: './src/bin/echo.ts',
            chmod: './src/bin/chmod.ts',
            chown: './src/bin/chown.ts',
            tail: './src/bin/tail.ts',
            head: './src/bin/head.ts',
        },
        output: {
            filename: "[name].js",
            path: path.resolve(__dirname, "dist/root/bin"),
        },
        plugins: [
            {
                apply: (compiler) => {
                    compiler.hooks.afterEmit.tap(
                        "JsonBinPlugin",
                        async (compilation) => {
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
                            }
                            await writeFile(path.resolve(__dirname, "dist/bin.json"), JSON.stringify(fs, null, 2));
                            // deepFiles(

                            // )
                            // fs.readdir(
                            //     path.resolve(__dirname, "root"),
                            //     (err, files) => {
                            //         const srcs = {};
                            //         files
                            //             .filter(f => !f.endsWith(".map"))
                            //             .forEach(file => {
                            //                 let content = fs.readFileSync(path.resolve(__dirname, "dist/bin", file), "utf-8");
                            //                 

                            //                 srcs[file.substr(0, file.length - 3)] = content;
                            //             });
                            //         fs.writeFileSync(path.resolve(__dirname, "dist/bin.json"), JSON.stringify(srcs, null, 2));
                            //         console.log("Output BIN JSON");
                            //     }
                            // );
                        }
                    )
                }
            }
        ],
    }),
];
