import glob from "glob";
import fs from "fs";
import path from "path";

import type { ViteDevServer, Plugin } from "vite";
import type { DefaultTheme } from "vitepress";

export interface AutoSidebarOptions {
  /**
   * call back when sidebar resolved.
   */
  sidebarResolved?: (value: DefaultTheme.SidebarMulti) => void;
  /**
   * doc dir
   */
  root?: string;
  /**
   * ignore some file
   */
  ignores?: string[];
}

const titleCache: Record<string, string> = {};
const pwd = process.cwd();

export default function VitePluginAutoSidebar(
  options: AutoSidebarOptions = {}
) {
  const root = options.root || process.cwd();
  return <Plugin>{
    name: "VitePluginAutoSidebar",
    config(config) {
      // @ts-ignore
      config.vitepress.site.themeConfig.sidebar = getSidebarConfig(
        root,
        options
      );
      return config;
    },
    configureServer: ({ watcher, restart }: ViteDevServer) => {
      const fsWatcher = watcher.add("*.md");
      fsWatcher.on("all", (event, filePath) => {
        if (event === "addDir") return;
        if (event === "unlinkDir") return;
        if (event == "add") return;
        if (event === "unlink") {
          restart();
          return;
        }
        if (event === "change") {
          const title = matchTitle(filePath);
          const route = getRoute(filePath);
          if (!route || !title) return;
          // 未更新 title
          if (title === titleCache[route]) return;
          restart();
          return;
        }
      });
    },
  };
}

function getSidebarConfig(root: string, opts: AutoSidebarOptions) {
  const paths = glob.sync("**/*.md", {
    cwd: root,
    ignore: opts.ignores,
  });

  const basePath = path.relative(pwd, root);
  const sidebar: DefaultTheme.SidebarMulti = {};

  paths.forEach((fullPath) => {
    const segments = fullPath.split("/");
    const absolutePath = path.resolve(root, fullPath);
    if (segments.length === 0) return;
    // { "/demo/dir1/":[]}
    const topLevel = basePath
      ? `/${basePath}/${segments.shift()}/`
      : `/${segments.shift()}/`;
    // 如果第一级是文件
    if (topLevel.endsWith(".md")) return;
    if (!sidebar[topLevel]) {
      sidebar[topLevel] = [];
    }
    let currentLevel = sidebar[topLevel];
    segments.forEach((segment) => {
      let curConfig = currentLevel.find((item) => item.text === segment);
      if (!curConfig) {
        const itemConfig: DefaultTheme.SidebarItem = {};
        // is file
        if (segment.endsWith(".md")) {
          const route = getRoute(absolutePath);
          itemConfig.text = matchTitle(absolutePath);
          itemConfig.link = route;
          // cache title
          titleCache[route] = itemConfig.text;
        } else {
          itemConfig.text = segment;
          itemConfig.collapsed = false;
          itemConfig.items = [];
        }
        currentLevel.push(itemConfig);
        curConfig = itemConfig;
      }
      currentLevel = curConfig.items as DefaultTheme.SidebarItem[];
    });
  });
  if (opts.sidebarResolved) {
    opts.sidebarResolved(sidebar);
  }
  return sidebar;
}

function matchTitle(p: string) {
  const content = fs.readFileSync(p, "utf-8");
  return ((content.match(/^#(.*)\n?/) || [])[1] || "").trim();
}

function getRoute(absPath: string) {
  return "/" + path.relative(pwd, absPath);
}
