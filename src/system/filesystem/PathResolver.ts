export default class PathResolver {
    public static parent(name: string) {
        const parts = name.split("/");
        parts.pop();
        return parts.join("/");
    }

    public static resolve(name: string, cwd: string, username: string) {
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
        const out: string[] = [];
        parts.forEach(p => {
            if (p == ".") return;
            else if (p == "..") out.pop();
            else out.push(p);
        });
        return "/" + out.filter(i => i.length > 0).join("/");
    }

    public static abreviate(path: string, cwd: string, username: string) {
        path = PathResolver.resolve(path, cwd, username);
        if (username == "root") {
            if (path.startsWith("/root/") || path == "/root") {
                path = "~" + path.substr("/root".length);
            }
        } else if (path.startsWith(`/home/${username}/`) || path == `/home/${username}`) {
            path = "~" + path.substr(`/root/${username}`.length);
        }
        return path;
    }
}
