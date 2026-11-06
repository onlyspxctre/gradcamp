// Keep the browser on one origin; the C backend remains a separate service.
export async function proxyBackend(request: Request): Promise<Response> {
    const incoming = new URL(request.url)
    const target = new URL(
        incoming.pathname + incoming.search,
        "http://localhost:3000"
    )
    const headers = new Headers(request.headers)
    headers.set("host", target.host)

    try {
        return await fetch(target, {
            method: request.method,
            headers,
            body: request.body,
            redirect: "manual",
            signal: request.signal,
        })
    } catch {
        return Response.json({ error: "Backend unavailable" }, { status: 502 })
    }
}

export function serverOptions(defaultPort: number) {
    const port = Number(process.env.PORT ?? defaultPort)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT must be an integer between 1 and 65535")
    }
    return {
        hostname: process.env.HOST ?? "127.0.0.1",
        port,
        // Fail rather than silently choosing a different port (important for e2e tests).
        reusePort: false,
    }
}
