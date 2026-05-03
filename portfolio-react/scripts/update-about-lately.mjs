import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAboutLatelyData, loadEnvFile } from "../lib/about-lately-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env.local");
const outputPath = path.join(projectRoot, "public", "about-lately.json");

const data = await createAboutLatelyData(await loadEnvFile(envPath));
await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Updated ${path.relative(projectRoot, outputPath)}`);
