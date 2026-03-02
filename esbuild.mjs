import * as esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

const sharedOptions = {
  bundle: true,
  sourcemap: true,
  logLevel: "info"
};

const buildOptions = [
  {
    ...sharedOptions,
    entryPoints: ["src/extension.ts"],
    outfile: "dist/extension.js",
    platform: "node",
    format: "cjs",
    external: ["vscode"],
  },
  {
    ...sharedOptions,
    entryPoints: ["src/webview/webview-main.ts"],
    outfile: "dist/webview-main.js",
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
