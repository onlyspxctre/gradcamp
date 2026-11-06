import { proxyBackend, serverOptions } from "./server.ts"

const dist = new URL("../dist/", import.meta.url).pathname
const index = Bun.file(`${dist}index.html`)
if (!(await index.exists())) {
    throw new Error("No production build found. Run bun run build first.")
}

// Register only build outputs, rather than mapping arbitrary URLs to disk paths.
const routes: Record<string, Response | typeof proxyBackend> = {}
for await (const path of new Bun.Glob("**/*").scan({
    cwd: dist,
    onlyFiles: true,
})) {
    routes[`/${path}`] = new Response(Bun.file(`${dist}${path}`))
}
routes["/upload"] = proxyBackend
routes["/fetch"] = proxyBackend
routes["/"] = new Response(index)

const server = Bun.serve({
    ...serverOptions(4173),
    development: false,
    routes,
    fetch(request) {
        // Navigation falls back to the SPA; missing assets must still return 404.
        if (
            (request.method === "GET" || request.method === "HEAD") &&
            request.headers.get("accept")?.includes("text/html")
        ) {
            return new Response(index)
        }
        return new Response("Not found", { status: 404 })
    },
})

console.log(`Frontend production preview: ${server.url}`)
