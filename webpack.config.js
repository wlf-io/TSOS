const path = require("path");

module.exports = {
    entry: {
        system: './src/system/root.ts',
        shell: './src/bin/shell.ts',
        ls: './src/bin/ls.ts',
        mkdir: './src/bin/mkdir.ts',
        rm: './src/bin/rm.ts',
        cd: './src/bin/cd.ts',
        touch: './src/bin/touch.ts',
        cat: './src/bin/cat.ts',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: (pathData, assetInfo) => {
            return pathData.chunk.name == "system" ? "[name].js" : "bin/[name].js";
        },
        path: path.resolve(__dirname, "dist"),
    },
    // devtool: "source-map",
    devServer: {
        contentBase: path.resolve(__dirname, "dist"),
        port: 9546
    }
};