import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import fs from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "vite";
import { promisify } from "node:util";
import { exec as execCb } from "node:child_process";

const APP_ID = "domain-switch";
const exec = promisify(execCb);

type HelloPayload = Record<string, never>;
type DownloadPayload = { domain: string; file?: string };

function getEnvVar(key: string) {
  // dev -> development, build -> production (нам для твоего кейса достаточно development)
  const mode = process.env.NODE_ENV || "development";

  // third param "" => грузим ВСЕ переменные, без фильтра по префиксу
  const env = loadEnv(mode, process.cwd(), "");

  return env[key] ?? process.env[key] ?? "";
}

export default function domainSwitchToolbar(): AstroIntegration {
  return {
    name: "domain-switch-toolbar",
    hooks: {
      "astro:config:setup": ({ command, addDevToolbarApp }) => {
        // Важно: только dev
        if (command !== "dev") return;

        addDevToolbarApp({
          id: APP_ID,
          name: "Domain",
          icon: "searchFile",
          entrypoint: fileURLToPath(new URL("./app.ts", import.meta.url)),
        });
      },

      "astro:server:setup": ({ toolbar, logger }) => {
        const presetsRaw = getEnvVar("DOMAIN_PRESETS");
        const currentDomain = getEnvVar("DOMAIN");

        const presets = (presetsRaw ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const jsonPath = getEnvVar("JSON_PATH").replace(/\/$/, "");

        // Handshake: клиент спросил — сервер ответил начальными данными
        toolbar.on<HelloPayload>(`${APP_ID}:hello`, () => {
          toolbar.send(`${APP_ID}:init`, {
            presets,
            currentDomain: currentDomain ?? "",
            hasJSONPath: Boolean(jsonPath),
          });
        });

        // Команда скачать файл
        toolbar.on<DownloadPayload>(`${APP_ID}:download`, async ({ domain, file }) => {
          const targetFile = file || "settings.json";
          const safeDomain = String(domain || "").trim();

          if (!jsonPath) {
            toolbar.send(`${APP_ID}:status`, {
              ok: false,
              message: "JSON_PATH пустой. Укажи JSON_PATH в .env и перезапусти pnpm dev.",
            });
            return;
          }
          if (!safeDomain) {
            toolbar.send(`${APP_ID}:status`, { ok: false, message: "Домен не выбран." });
            return;
          }

          const url = `${jsonPath}/${safeDomain}/data/${targetFile}`;
          const dest = path.join(process.cwd(), "src", "data", targetFile);

          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status} при скачивании: ${url}`);

            const buf = Buffer.from(await res.arrayBuffer());
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fs.writeFile(dest, buf);

            toolbar.send(`${APP_ID}:status`, {
              ok: true,
              message: `OK: скачал ${targetFile} (${buf.length} bytes) с домена ${safeDomain}`,
              domain: safeDomain,
            });

            // Пост-обработка для отдельных файлов
            if (targetFile === "settings.json") {
              try {
                const { stdout, stderr } = await exec("node .github/scripts/setBrand.mjs", {
                  cwd: process.cwd(),
                });
                if (stdout?.trim()) logger.info(`[${APP_ID}] setBrand: ${stdout.trim()}`);
                if (stderr?.trim()) logger.warn(`[${APP_ID}] setBrand stderr: ${stderr.trim()}`);
                toolbar.send(`${APP_ID}:status`, {
                  ok: true,
                  message: "Обновил данные бренда (setBrand.mjs)",
                  domain: safeDomain,
                });
              } catch (err: any) {
                logger.warn(`[${APP_ID}] setBrand error: ${err?.message ?? err}`);
                toolbar.send(`${APP_ID}:status`, {
                  ok: false,
                  message: `setBrand.mjs error: ${err?.message ?? err}`,
                });
              }
            } else if (targetFile === "banners.json") {
              try {
                const { stdout, stderr } = await exec("node .github/scripts/replacePlaceholdersAndSearchDates.js", {
                  cwd: process.cwd(),
                });
                if (stdout?.trim()) logger.info(`[${APP_ID}] replacePlaceholders: ${stdout.trim()}`);
                if (stderr?.trim()) logger.warn(`[${APP_ID}] replacePlaceholders stderr: ${stderr.trim()}`);
                toolbar.send(`${APP_ID}:status`, {
                  ok: true,
                  message: "Обновил баннеры (replacePlaceholdersAndSearchDates.js)",
                  domain: safeDomain,
                });
              } catch (err: any) {
                logger.warn(`[${APP_ID}] replacePlaceholders error: ${err?.message ?? err}`);
                toolbar.send(`${APP_ID}:status`, {
                  ok: false,
                  message: `replacePlaceholders error: ${err?.message ?? err}`,
                });
              }
            }
          } catch (e: any) {
            logger.warn(`[${APP_ID}] ${e?.message ?? e}`);
            toolbar.send(`${APP_ID}:status`, {
              ok: false,
              message: e?.message ?? String(e),
            });
          }
        });
      },
    },
  };
}
