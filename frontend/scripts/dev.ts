import index from "../index.html"
import { proxyBackend, serverOptions } from "./server.ts"

const server = Bun.serve({
    ...serverOptions(5173),
    development: { hmr: true, console: true },
    routes: {
        "/upload": proxyBackend,
        "/fetch": proxyBackend,
        "/*": index,
    },
})

console.log(`Frontend development server: ${server.url}`)
