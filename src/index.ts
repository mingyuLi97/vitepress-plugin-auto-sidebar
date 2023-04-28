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
  docs?: string;
  /**
   * ignore some file
   */
  ignores?: string[];
  /**
   * .vitepress 所在的文件夹
   */
  root?: string;
}

const titleCache: Record<string, string> = {};

export default function VitePluginAutoSidebar(
  options: AutoSidebarOptions = {}
) {
  const opts = normalizeOptions(options);
  return <Plugin>{
    name: "VitePluginAutoSidebar",
    config(config) {
      // @ts-ignore
      config.vitepress.site.themeConfig.sidebar = getSidebarConfig(opts);
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
          const route = getRoute(opts.root, filePath);
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

function getSidebarConfig(opts: Required<AutoSidebarOptions>) {
  const docsPath = opts.docs;
  const paths = glob.sync("**/*.md", {
    cwd: docsPath,
    ignore: opts.ignores,
  });

  const basePath = path.relative(opts.root, docsPath);
  const sidebar: DefaultTheme.SidebarMulti = {};

  paths.forEach((fullPath) => {
    const segments = fullPath.split("/");
    const absolutePath = path.resolve(docsPath, fullPath);
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
          const route = getRoute(opts.root, absolutePath);
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

function getRoute(root: string, absPath: string) {
  return "/" + path.relative(root, absPath);
}

/**
 * 将用户的配置加上默认属性
 * TODO：支持多种配置类型
 */
function normalizeOptions(
  options: AutoSidebarOptions
): Required<AutoSidebarOptions> {
  let root = options.root;
  if (!root) {
    const files = glob.sync("**/.vitepress/config.*", {
      cwd: process.cwd(),
      dot: true,
      ignore: ["node_modules/**/*"],
    });

    if (files.length !== 1) {
      console.error("[WARNING] 找到多个 .vitepress/config 配置文件", files);
    }
    root = path.resolve(files[0], "../..");
  }

  return {
    root,
    docs: options.docs || root,
    ignores: options.ignores ?? [],
    sidebarResolved: options.sidebarResolved ?? function () {},
  };
}
