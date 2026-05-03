import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom plugin to read the Sets directory directly via Node fs.
function readSetsPlugin() {
  const virtualId = "virtual:default-sets";
  const resolvedVirtualId = "\0" + virtualId;

  return {
    name: "read-sets",
    resolveId(id: string) {
      if (id === virtualId) return resolvedVirtualId;
    },
    load(id: string) {
      if (id === resolvedVirtualId) {
        const setsDir = path.resolve(__dirname, "Sets");
        const data: Record<string, string> = {};

        if (fs.existsSync(setsDir)) {
          const walk = (dir: string) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              const filepath = path.join(dir, file);
              if (fs.statSync(filepath).isDirectory()) {
                walk(filepath);
              } else if (file.toLowerCase().endsWith(".set")) {
                const relativePath = path.relative(__dirname, filepath).replace(/\\/g, "/");
                
                // Read raw buffer to safely handle MT5's UTF-16LE encoding
                const buffer = fs.readFileSync(filepath);
                let content = '';

                // MT5 files use UTF-16LE. Check for the BOM (FF FE)
                if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
                  content = buffer.slice(2).toString("utf16le");
                } 
                // If there's no BOM but it contains null bytes, it's still UTF-16LE
                else if (buffer.includes(0x00)) {
                  content = buffer.toString("utf16le");
                } 
                // Otherwise fallback to standard UTF-8
                else {
                  content = buffer.toString("utf-8");
                }

                // Strip carriage returns to ensure consistent parsing
                data[relativePath] = content.replace(/\r/g, "");
              }
            }
          };
          walk(setsDir);
        }
        return `export default ${JSON.stringify(data)};`;
      }
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), readSetsPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});