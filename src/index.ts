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
          const route = "/" + path.relative(root, filePath);
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
  const obj: Record<string, string[][]> = {};
  const sidebar: DefaultTheme.SidebarMulti = {};
  // build first
  for (const path of paths) {
    const pathSegments = path.split("/");
    if (pathSegments[0].endsWith(".md")) continue;
    const key = "/" + pathSegments[0] + "/";
    const data = pathSegments.slice(1);
    if (!obj[key]) {
      obj[key] = [];
    }
    obj[key].push(data);
  }

  // resolve sidebar
  for (const key of Object.keys(obj)) {
    const data = obj[key];
    const result: any[] = [];
    for (const pathSegments of data) {
      let currentLevel = result;

      for (const segment of pathSegments) {
        let existingPath = currentLevel.find((item) => item.text === segment);
        if (!existingPath) {
          const itemConfig: DefaultTheme.SidebarItem = {};
          // is file
          if (segment.endsWith(".md")) {
            const route = key + pathSegments.join("/");
            itemConfig.text = matchTitle(path.join(root, route));
            itemConfig.link = route;
            // cache title
            titleCache[route] = itemConfig.text;
          } else {
            itemConfig.text = segment;
            itemConfig.collapsed = false;
            itemConfig.items = [];
          }
          currentLevel.push(itemConfig);
          existingPath = itemConfig;
        }
        currentLevel = existingPath.items;
      }
    }
    sidebar[key] = result;
  }
  if (opts.sidebarResolved) {
    opts.sidebarResolved(sidebar);
  }
  return sidebar;
}

function matchTitle(p: string) {
  const content = fs.readFileSync(p, "utf-8");
  return ((content.match(/^#(.*)\n?/) || [])[1] || "").trim();
}
