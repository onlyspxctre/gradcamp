import { afterEach, expect, spyOn, test } from "bun:test"
import { proxyBackend, serverOptions } from "../scripts/server.ts"

const originalPort = process.env.PORT
const originalHost = process.env.HOST
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined

afterEach(() => {
    fetchSpy?.mockRestore()
    fetchSpy = undefined
    if (originalPort === undefined) delete process.env.PORT
    else process.env.PORT = originalPort
    if (originalHost === undefined) delete process.env.HOST
    else process.env.HOST = originalHost
})

test("server bind defaults and explicit overrides", () => {
    delete process.env.PORT
    delete process.env.HOST
    expect(serverOptions(5173)).toMatchObject({
        hostname: "127.0.0.1",
        port: 5173,
    })
    process.env.PORT = "4173"
    process.env.HOST = "0.0.0.0"
    expect(serverOptions(5173)).toMatchObject({
        hostname: "0.0.0.0",
        port: 4173,
    })
})

test("invalid ports fail rather than falling back to another port", () => {
    for (const port of ["", "0", "-1", "1.5", "65536", "invalid"]) {
        process.env.PORT = port
        expect(() => serverOptions(5173)).toThrow("PORT must be an integer")
    }
})

test("backend proxy preserves upload query, body, headers, and response status", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
        async (url, init) => {
            const forwarded = new Request(url, init)
            expect(forwarded.url).toBe(
                "http://localhost:3000/upload?job=example%20id"
            )
            expect(forwarded.method).toBe("POST")
            expect(forwarded.headers.get("host")).toBe("localhost:3000")
            expect(forwarded.headers.get("content-type")).toBe("text/plain")
            expect(await forwarded.text()).toBe("int main(void) { return 0; }")
            expect(init?.redirect).toBe("manual")
            return new Response("submitted", {
                status: 202,
                headers: { "x-job": "example" },
            })
        }
    )

    const response = await proxyBackend(
        new Request("http://localhost:5173/upload?job=example%20id", {
            method: "POST",
            headers: { "content-type": "text/plain", host: "localhost:5173" },
            body: "int main(void) { return 0; }",
        })
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(202)
    expect(response.headers.get("x-job")).toBe("example")
    expect(await response.text()).toBe("submitted")
})

test("backend proxy preserves polling GET requests without a body", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
        async (url, init) => {
            const forwarded = new Request(url, init)
            expect(forwarded.url).toBe(
                "http://localhost:3000/fetch?job=example"
            )
            expect(forwarded.method).toBe("GET")
            expect(forwarded.body).toBeNull()
            return Response.json({ status: "pending" })
        }
    )
    const response = await proxyBackend(
        new Request("http://localhost:5173/fetch?job=example")
    )
    expect(await response.json()).toEqual({ status: "pending" })
})

test("unreachable backend returns a gateway error, not SPA HTML", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Connection refused")
    )
    const response = await proxyBackend(
        new Request("http://localhost:5173/fetch?job=example")
    )
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: "Backend unavailable" })
})
