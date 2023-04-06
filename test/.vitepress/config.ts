import { defineConfig } from "vitepress";
import VitePluginAutoSidebar from "vite-plugin-vitepress-auto-sidebar";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "demo",
  description: "test plugin",
  vite: {
    plugins: [
      VitePluginAutoSidebar({
        sidebarResolved(value) {
          console.log(JSON.stringify(value, null, 2));
          value["/dir2/"][0].items?.sort((a, b) => a.text - b.text);
          value["/dir2/"][0].text = 'sorted'
        },
        ignores: ["index.md"],
        root: process.cwd(),
      }),
    ],
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "dir1", link: "/dir1/dir1-1/1" },
      { text: "dir2", link: "/dir2/2-2/2" },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
