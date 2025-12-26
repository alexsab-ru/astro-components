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

const domainFiles = [
  "settings.json",
  "banners.json",
  "salons.json",
  "menu.json",
  "scripts.json",
  "socials.json",
  "collections.json",
  "faq.json",
  "federal-disclaimer.json",
  "models-sections.yml",
  "reviews.json",
  "seo.json",
  "services.json",
  "special-services.json",
];

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

        const runScript = async (cmd: string, label: string) => {
          try {
            const { stdout, stderr } = await exec(cmd, { cwd: process.cwd() });
            if (stdout?.trim()) logger.info(`[${APP_ID}] ${label}: ${stdout.trim()}`);
            if (stderr?.trim()) logger.warn(`[${APP_ID}] ${label} stderr: ${stderr.trim()}`);
            toolbar.send(`${APP_ID}:status`, { ok: true, message: label });
            return true;
          } catch (err: any) {
            logger.warn(`[${APP_ID}] ${label} error: ${err?.message ?? err}`);
            toolbar.send(`${APP_ID}:status`, { ok: false, message: `${label} error: ${err?.message ?? err}` });
            return false;
          }
        };

        const downloadDomainFile = async (safeDomain: string, targetFile: string) => {
          const url = `${jsonPath}/${safeDomain}/data/${targetFile}`;
          const dest = path.join(process.cwd(), "src", "data", targetFile);

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

          if (targetFile === "settings.json") {
            await runScript("node .github/scripts/setBrand.mjs", "Обновил данные бренда (setBrand.mjs)");
            await runScript("node .github/scripts/filterModelsByBrand.js", "Обновил модели (filterModelsByBrand)");
          }
          if (targetFile === "banners.json") {
            await runScript(
              "node .github/scripts/replacePlaceholdersAndSearchDates.js",
              "Обновил баннеры (replacePlaceholdersAndSearchDates.js)"
            );
          }
        };

        // Команда скачать файл/файлы
        toolbar.on<DownloadPayload>(`${APP_ID}:download`, async ({ domain, file }) => {
          const targetFile = file || "settings.json";
          const safeDomain = String(domain || "").trim();

          const isCommonModels = targetFile === "__common_models__";
          const isCommonCars = targetFile === "__common_cars__";
          const isDownloadAll = targetFile === "__all__";

          // Общие файлы, не зависящие от домена
          if (isCommonModels) {
            await runScript("bash ./.github/scripts/sh/downloadCommonModelsJSON.sh", "Скачал общий models");
            return;
          }
          if (isCommonCars) {
            await runScript("bash ./.github/scripts/sh/downloadCommonCarsJSON.sh", "Скачал общий cars");
            return;
          }

          // Всё остальное требует jsonPath и домен
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

          const filesToDownload = isDownloadAll ? domainFiles : [targetFile];

          try {
            for (const f of filesToDownload) {
              await downloadDomainFile(safeDomain, f);
            }
            if (isDownloadAll) {
              toolbar.send(`${APP_ID}:status`, {
                ok: true,
                message: `OK: скачал ${filesToDownload.length} файлов для ${safeDomain}`,
                domain: safeDomain,
              });
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
