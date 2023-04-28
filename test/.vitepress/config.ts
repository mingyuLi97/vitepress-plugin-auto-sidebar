import { defineConfig } from "vitepress";
import VitePluginAutoSidebar from "@iminu/vitepress-plugin-auto-sidebar";
import path from "path";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "demo",
  description: "test plugin",
  vite: {
    plugins: [
      VitePluginAutoSidebar({
        sidebarResolved(value) {
          value["/demo/dir2/"][0].items?.sort((a, b) => a.text - b.text);
          value["/demo/dir2/"][0].text = "sorted";
        },
        ignores: ["index.md"],
        root: path.resolve(process.cwd(), "demo"),
      }),
    ],
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "dir1", link: "/demo/dir1/dir1-1/1" },
      { text: "dir2", link: "/demo/dir2/2-2/2" },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
