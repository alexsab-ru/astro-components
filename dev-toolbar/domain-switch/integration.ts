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
type DownloadPayload = { domain: string; file?: string; preserveLog?: boolean };

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

        /**
         * Сводка последнего запуска.
         *
         * Зачем:
         * - UI тулбара может перезагрузиться в конце операции и не получить финальные статусы.
         * - При следующем открытии тулбара мы отдаём итоги последней операции, чтобы 100% понять:
         *   были ли ошибки или нет.
         */
        let lastRun:
          | {
              opId: string;
              ok: boolean;
              summary: string;
              errors: string[];
              finishedAt: string;
            }
          | null = null;

        /**
         * Серверный лог в файл (на стороне Node.js).
         *
         * Зачем:
         * - UI Dev Toolbar может перезагружаться во время операций (скачивание/запись/перестройка),
         *   и тогда сообщения "в моменте" визуально пропадают.
         * - файл переживает перезагрузки и сохраняет ВСЮ историю выполнения наверняка.
         *
         * Где лежит:
         * - по умолчанию: `tmp/dev-toolbar/domain-switch.log`
         * - можно переопределить переменной окружения: `DOMAIN_SWITCH_LOG_FILE=/abs/path/to/log`
         *
         * Важно:
         * - логгирование НЕ должно ломать работу тулбара. Поэтому любые ошибки записи в файл
         *   просто игнорируем (best-effort).
         */
        const logFilePath =
          getEnvVar("DOMAIN_SWITCH_LOG_FILE") ||
          path.join(process.cwd(), "tmp", "dev-toolbar", "domain-switch.log");

        const appendServerLog = async (level: "INFO" | "WARN", message: string, opId?: string) => {
          try {
            await fs.mkdir(path.dirname(logFilePath), { recursive: true });
            const opPart = opId ? ` [OP:${opId}]` : "";
            const line = `[${new Date().toISOString()}] [${APP_ID}] [${level}]${opPart} ${message}\n`;
            await fs.appendFile(logFilePath, line, "utf8");
          } catch {
            // best-effort: не мешаем основному процессу
          }
        };

        /**
         * Очистка серверного log-файла.
         *
         * Почему именно тут:
         * - пользователь просит "гарантировать" отсутствие ошибок.
         * - если preserveLog выключен, то проще всего начинать с чистого файла
         *   и писать туда только текущий запуск.
         */
        const truncateServerLog = async () => {
          try {
            await fs.mkdir(path.dirname(logFilePath), { recursive: true });
            await fs.writeFile(logFilePath, "", "utf8");
          } catch {
            // best-effort
          }
        };

        /**
         * Единый способ "сообщить прогресс":
         * - в UI (toolbar.send)
         * - в консоль Astro (logger)
         * - в файл (appendServerLog)
         *
         * Так мы НЕ теряем сообщения, даже если UI перезагрузился.
         */
        const report = async (
          data: { ok: boolean; message: string; domain?: string; isFinal?: boolean },
          opId?: string
        ) => {
          toolbar.send(`${APP_ID}:status`, data);
          if (data.ok) {
            logger.info(`[${APP_ID}] ${data.message}`);
            await appendServerLog("INFO", data.message, opId);
          } else {
            logger.warn(`[${APP_ID}] ${data.message}`);
            await appendServerLog("WARN", data.message, opId);
          }
        };

        // Handshake: клиент спросил — сервер ответил начальными данными
        toolbar.on<HelloPayload>(`${APP_ID}:hello`, () => {
          toolbar.send(`${APP_ID}:init`, {
            presets,
            currentDomain: currentDomain ?? "",
            hasJSONPath: Boolean(jsonPath),
            lastRun,
          });
        });

        const runScript = async (
          cmd: string,
          label: string,
          opId?: string,
          onError?: (message: string) => void
        ) => {
          try {
            await report({ ok: true, message: `RUN: ${label}` }, opId);
            const { stdout, stderr } = await exec(cmd, { cwd: process.cwd() });
            if (stdout?.trim()) logger.info(`[${APP_ID}] ${label}: ${stdout.trim()}`);
            if (stderr?.trim()) logger.warn(`[${APP_ID}] ${label} stderr: ${stderr.trim()}`);
            await appendServerLog("INFO", `DONE: ${label}`, opId);
            await report({ ok: true, message: label }, opId);
            return true;
          } catch (err: any) {
            const msg = `${label} error: ${err?.message ?? err}`;
            logger.warn(`[${APP_ID}] ${msg}`);
            await appendServerLog("WARN", msg, opId);
            await report({ ok: false, message: msg }, opId);
            // Важно: добавляем в список ошибок текущей операции (для финального вердикта).
            onError?.(msg);
            return false;
          }
        };

        const downloadDomainFile = async (
          safeDomain: string,
          targetFile: string,
          opId?: string,
          onError?: (message: string) => void
        ) => {
          const url = `${jsonPath}/${safeDomain}/data/${targetFile}`;
          const dest = path.join(process.cwd(), "src", "data", targetFile);

          await report({ ok: true, message: `START: скачиваю ${targetFile} с домена ${safeDomain}` }, opId);
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status} при скачивании: ${url}`);

          const arrayBuffer = await res.arrayBuffer();
          const buf = new Uint8Array(arrayBuffer);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.writeFile(dest, buf);

          await report({
            ok: true,
            message: `OK: скачал ${targetFile} (${buf.length} bytes) с домена ${safeDomain}`,
            domain: safeDomain,
          }, opId);

          if (targetFile === "settings.json") {
            await runScript(
              "node .github/scripts/setBrand.mjs",
              "Обновил данные бренда (setBrand.mjs)",
              opId,
              onError
            );
            await runScript(
              "node .github/scripts/filterModelsByBrand.js",
              "Обновил модели (filterModelsByBrand)",
              opId,
              onError
            );
          }
          if (targetFile === "banners.json") {
            await runScript(
              "node .github/scripts/replacePlaceholdersAndSearchDates.js",
              "Обновил баннеры (replacePlaceholdersAndSearchDates.js)",
              opId,
              onError
            );
          }
        };

        // Команда скачать файл/файлы
        toolbar.on<DownloadPayload>(`${APP_ID}:download`, async ({ domain, file, preserveLog }) => {
          const targetFile = file || "settings.json";
          const safeDomain = String(domain || "").trim();
          const preserve = Boolean(preserveLog);

          /**
           * ID операции нужен, чтобы:
           * - пометить записи в log-файле
           * - сохранить lastRun и показать итоги после перезагрузки UI
           */
          const opId = `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;

          // Ошибки собираем в массив. Это и есть наш "100% вердикт".
          // Всё, что мы считаем ошибкой, отправляем через report({ok:false,...}),
          // а значит попадает и в UI, и в файл, и в lastRun.
          const errors: string[] = [];
          const reportRun = async (data: { ok: boolean; message: string; domain?: string; isFinal?: boolean }) => {
            if (data.ok === false) errors.push(data.message);
            await report(data, opId);
          };

          const finalizeRun = async (summary: string) => {
            const ok = errors.length === 0;
            lastRun = {
              opId,
              ok,
              summary,
              errors,
              finishedAt: new Date().toISOString(),
            };

            if (!ok) {
              // Отдельно дублим ошибки в UI в конце, чтобы их было проще заметить
              // даже если часть сообщений "потерялась" из-за перезагрузки UI.
              for (const err of errors) {
                await report({ ok: false, message: `ERR: ${err}` }, opId);
              }
              await reportRun({ ok: false, message: `FINISH: ${summary} (ошибок: ${errors.length})`, isFinal: true });
            } else {
              await reportRun({ ok: true, message: `FINISH: ${summary} (без ошибок)`, isFinal: true });
            }
          };

          // Управляем файлом лога в зависимости от Preserve log.
          if (!preserve) {
            await truncateServerLog();
            await appendServerLog("INFO", "TRUNCATE: preserveLog выключен -> очищаю log-файл перед запуском", opId);
          } else {
            await appendServerLog("INFO", "PRESERVE: preserveLog включен -> log-файл НЕ очищаю", opId);
          }

          await appendServerLog("INFO", `OP_START: file=${targetFile} domain=${safeDomain || "-"} preserveLog=${preserve}`, opId);

          const isCommonModels = targetFile === "__common_models__";
          const isCommonCars = targetFile === "__common_cars__";
          const isDownloadAll = targetFile === "__all__";

          // Общие файлы, не зависящие от домена
          if (isCommonModels) {
            try {
              await reportRun({ ok: true, message: "START: скачиваю общий models" });
              await runScript(
                "bash ./.github/scripts/sh/downloadCommonModelsJSON.sh",
                "Скачал общий models",
                opId,
                (msg) => errors.push(msg)
              );
            } catch (e: any) {
              await reportRun({ ok: false, message: e?.message ?? String(e) });
            } finally {
              await appendServerLog("INFO", "OP_END", opId);
              await finalizeRun("Общий models");
            }
            return;
          }
          if (isCommonCars) {
            try {
              await reportRun({ ok: true, message: "START: скачиваю общий cars" });
              await runScript(
                "bash ./.github/scripts/sh/downloadCommonCarsJSON.sh",
                "Скачал общий cars",
                opId,
                (msg) => errors.push(msg)
              );
            } catch (e: any) {
              await reportRun({ ok: false, message: e?.message ?? String(e) });
            } finally {
              await appendServerLog("INFO", "OP_END", opId);
              await finalizeRun("Общий cars");
            }
            return;
          }

          // Всё остальное требует jsonPath и домен
          if (!jsonPath) {
            await reportRun({
              ok: false,
              message: "JSON_PATH пустой. Укажи JSON_PATH в .env и перезапусти pnpm dev.",
            });
            await appendServerLog("INFO", "OP_END", opId);
            await finalizeRun("Ошибка конфигурации JSON_PATH");
            return;
          }
          if (!safeDomain) {
            await reportRun({ ok: false, message: "Домен не выбран." });
            await appendServerLog("INFO", "OP_END", opId);
            await finalizeRun("Ошибка: домен не выбран");
            return;
          }

          const filesToDownload = isDownloadAll ? domainFiles : [targetFile];

          try {
            await reportRun({
              ok: true,
              message: `START: скачивание (${filesToDownload.length} шт.) для домена ${safeDomain}`,
              domain: safeDomain,
            });
            for (const f of filesToDownload) {
              await downloadDomainFile(safeDomain, f, opId, (msg) => errors.push(msg));
            }
            if (isDownloadAll) {
              await reportRun({ ok: true, message: `OK: скачал ${filesToDownload.length} файлов для ${safeDomain}`, domain: safeDomain });
            }
            await appendServerLog("INFO", "OP_END", opId);
            await finalizeRun(isDownloadAll ? `Скачал все файлы для ${safeDomain}` : `Скачал ${targetFile} для ${safeDomain}`);
          } catch (e: any) {
            const msg = e?.message ?? String(e);
            logger.warn(`[${APP_ID}] ${msg}`);
            await appendServerLog("WARN", msg, opId);
            await reportRun({ ok: false, message: msg });
            await appendServerLog("INFO", "OP_END", opId);
            await finalizeRun(isDownloadAll ? `Скачивание всех файлов для ${safeDomain}` : `Скачивание ${targetFile} для ${safeDomain}`);
          }
        });
      },
    },
  };
}
