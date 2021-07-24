const path = require("path");
const fs = require("fs");

const config = {
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [{
                    loader: "ts-loader",
                    options: {
                        configFile: "tsconfig.webpack.json"
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
        },
        output: {
            filename: "[name].js",
            path: path.resolve(__dirname, "dist/bin"),
        },
        plugins: [
            {
                apply: (compiler) => {
                    compiler.hooks.afterEmit.tap(
                        "JsonBinPlugin",
                        (compilation) => {
                            fs.readdir(
                                path.resolve(__dirname, "dist/bin"),
                                (err, files) => {
                                    const srcs = {};
                                    files
                                        .filter(f => f.endsWith(".js"))
                                        .forEach(file => {
                                            let content = fs.readFileSync(path.resolve(__dirname, "dist/bin", file), "utf-8");
                                            content = content.replace(`//# sourceMappingURL=${file}.map`, `//# sourceMappingURL=/bin/${file}.map`);
                                            content = content.replace('var __webpack_exports__ =', 'return');

                                            srcs[file.substr(0, file.length - 3)] = content;
                                        });
                                    fs.writeFileSync(path.resolve(__dirname, "dist/bin.json"), JSON.stringify(srcs, null, 2));
                                    console.log("Output BIN JSON");
                                }
                            );
                        }
                    )
                }
            }
        ],
    }),
];