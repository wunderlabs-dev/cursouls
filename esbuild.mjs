import * as esbuild from "esbuild";
import path from "node:path";

const isWatch = process.argv.includes("--watch");

const sharedOptions = {
  bundle: true,
  sourcemap: true,
  logLevel: "info",
  alias: {
    "@ext": path.resolve("src/extension"),
    "@web": path.resolve("src/webview"),
    "@shared": path.resolve("src/shared"),
    "@test": path.resolve("test"),
  },
};

const buildOptions = [
  {
    ...sharedOptions,
    entryPoints: ["src/extension/entry.ts"],
    outfile: "dist/extension.js",
    tsconfig: "tsconfig.extension.json",
    platform: "node",
    format: "cjs",
    external: ["vscode"],
  },
  {
    ...sharedOptions,
    entryPoints: ["src/webview/main.tsx"],
    outfile: "dist/webview-main.js",
    tsconfig: "tsconfig.webview.json",
    platform: "browser",
    format: "esm",
  },
];

async function run() {
  if (isWatch) {
    const contexts = await Promise.all(
      buildOptions.map((options) => esbuild.context(options)),
    );
    await Promise.all(contexts.map((context) => context.watch()));
    return;
  }

  await Promise.all(buildOptions.map((options) => esbuild.build(options)));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
