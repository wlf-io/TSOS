import { PathResolver } from "./FileSystem";
import { System } from "./System";

// @ts-ignore
window.PathResolver = PathResolver;

System.boot();