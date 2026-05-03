import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createAboutLatelyData, loadEnvFile, setNoStoreHeaders } from "./lib/about-lately-data.js";

// https://vite.dev/config/
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env.local");

export default defineConfig({
  plugins: [
    react(),
    {
      name: "about-lately-api",
      configureServer(server) {
        server.middlewares.use("/api/about-lately", async (req, res) => {
          try {
            setNoStoreHeaders(res);
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(await createAboutLatelyData(await loadEnvFile(envPath))));
          } catch (error) {
            server.config.logger.error(error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Unable to load about-lately data" }));
          }
        });
      },
    },
  ],
});
