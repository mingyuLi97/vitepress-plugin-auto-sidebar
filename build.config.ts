import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index"],
  externals: ["vite", "vitepress"],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
  },
});
