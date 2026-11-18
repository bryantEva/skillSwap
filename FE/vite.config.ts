import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// Semua request ke /api/* diteruskan ke BE (default http://localhost:3000),
// jadi BE tidak perlu setting CORS selama development.
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, ".", "")
    const backend = env.VITE_BACKEND_URL || "http://localhost:3000"

    return {
        plugins: [react(), tailwindcss()],
        server: {
            port: 5173,
            proxy: {
                "/api": {
                    target: backend,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, "")
                }
            }
        }
    }
})
