import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": resolve(import.meta.dirname, "./src"),
        },
    },
    server: {
        proxy: {
            "/upload": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
            "/fetch": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
        },
    },
})
