import { rm } from "node:fs/promises"
import tailwind from "bun-plugin-tailwind"

// Build the same HTML entry used by the dev server into deployable static files.
await rm(new URL("../dist", import.meta.url), { recursive: true, force: true })
const result = await Bun.build({
    entrypoints: [new URL("../index.html", import.meta.url).pathname],
    outdir: new URL("../dist", import.meta.url).pathname,
    target: "browser",
    minify: true,
    splitting: true,
    plugins: [tailwind],
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
})

if (!result.success) {
    for (const message of result.logs) console.error(message)
    process.exit(1)
}
console.log(`Built ${result.outputs.length} files in dist/`)
