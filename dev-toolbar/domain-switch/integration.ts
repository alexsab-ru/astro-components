import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import fs from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "vite";
import { promisify } from "node:util";
import { execFile as execFileCb } from "node:child_process";

const APP_ID = "domain-switch";
const execFile = promisify(execFileCb);
const DOWNLOAD_SCRIPT = "./.github/scripts/sh/downloadCommonRepo.sh";

type HelloPayload = Record<string, never>;
type DownloadPayload = { domain: string; file?: string; preserveLog?: boolean };

const domainFiles = [
  "settings.json",
  "banners.json",
  "scripts.json",
  "env.json",
  "salons.json",
  "menu.json",
  "socials.json",
  "collections.json",
  "faq.json",
  "federal-disclaimer.json",
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

        const jsonRepo = getEnvVar("JSON_REPO").trim();

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
            hasJSONRepo: Boolean(jsonRepo),
            lastRun,
          });
        });

        const toText = (value: string | Buffer | undefined) => {
          if (typeof value === "string") return value.trim();
          if (value) return value.toString("utf8").trim();
          return "";
        };

        const runScript = async (
          command: string,
          args: string[],
          label: string,
          opId?: string,
          onError?: (message: string) => void,
          extraEnv?: Record<string, string>
        ) => {
          try {
            await report({ ok: true, message: `RUN: ${label}` }, opId);
            const { stdout, stderr } = await execFile(command, args, {
              cwd: process.cwd(),
              env: { ...process.env, ...extraEnv },
            });
            const out = toText(stdout);
            const errOut = toText(stderr);
            if (out) logger.info(`[${APP_ID}] ${label}: ${out}`);
            if (errOut) logger.warn(`[${APP_ID}] ${label} stderr: ${errOut}`);
            await appendServerLog("INFO", `DONE: ${label}`, opId);
            await report({ ok: true, message: label }, opId);
            return true;
          } catch (err: any) {
            const errOut = toText(err?.stderr);
            const out = toText(err?.stdout);
            const details = [errOut, out].filter(Boolean).join("\n");
            const msg = details
              ? `${label} error: ${err?.message ?? err}\n${details}`
              : `${label} error: ${err?.message ?? err}`;
            logger.warn(`[${APP_ID}] ${msg}`);
            await appendServerLog("WARN", msg, opId);
            await report({ ok: false, message: msg }, opId);
            // Важно: добавляем в список ошибок текущей операции (для финального вердикта).
            onError?.(msg);
            return false;
          }
        };

        const runDownloadCommonRepo = async (
          safeDomain: string,
          files: string[] | null,
          label: string,
          opId?: string,
          onError?: (message: string) => void,
          options?: {
            skipDealerFiles?: boolean;
            skipModelSections?: boolean;
            skipModels?: boolean;
            skipCars?: boolean;
          }
        ) => {
          const args = [DOWNLOAD_SCRIPT];
          if (files && files.length) {
            args.push("-f", files.join(","));
          }

          if (options?.skipDealerFiles) args.push("--skip-dealer-files");
          if (options?.skipModelSections) args.push("--skip-model-sections");
          if (options?.skipModels) args.push("--skip-models");
          if (options?.skipCars) args.push("--skip-cars");

          return runScript("bash", args, label, opId, onError, {
            DOMAIN: safeDomain,
            JSON_REPO: jsonRepo,
          });
        };

        const runPostScriptsForFiles = async (
          files: string[],
          opId?: string,
          onError?: (message: string) => void
        ) => {
          const hasDataFile = async (fileName: string) => {
            const filePath = path.join(process.cwd(), "src", "data", fileName);
            try {
              await fs.access(filePath);
              return true;
            } catch {
              return false;
            }
          };

          if (files.includes("settings.json")) {
            if (await hasDataFile("settings.json")) {
              await runScript(
                "node",
                [".github/scripts/setBrand.mjs"],
                "Обновил данные бренда (setBrand.mjs)",
                opId,
                onError
              );
              await runScript(
                "node",
                [".github/scripts/filterModelsByBrand.js"],
                "Обновил модели (filterModelsByBrand)",
                opId,
                onError
              );
            } else {
              await report({ ok: true, message: "SKIP: settings.json не найден, post-скрипты пропущены." }, opId);
            }
          }

          if (files.includes("banners.json")) {
            if (await hasDataFile("banners.json")) {
              await runScript(
                "node",
                [".github/scripts/replacePlaceholdersAndSearchDates.js"],
                "Обновил баннеры (replacePlaceholdersAndSearchDates.js)",
                opId,
                onError
              );
            } else {
              await report({ ok: true, message: "SKIP: banners.json не найден, post-скрипт пропущен." }, opId);
            }
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
          const isKnownDomainFile = domainFiles.includes(targetFile);

          if (!jsonRepo) {
            await reportRun({
              ok: false,
              message: "JSON_REPO пустой. Укажи JSON_REPO в .env и перезапусти pnpm dev.",
            });
            await appendServerLog("INFO", "OP_END", opId);
            await finalizeRun("Ошибка конфигурации JSON_REPO");
            return;
          }

          // Общие файлы скачиваем через тот же скрипт с нужными флагами.
          if (isCommonModels) {
            const commonDomain = safeDomain || String(currentDomain || "").trim();
            if (!commonDomain) {
              await reportRun({
                ok: false,
                message: "Для общего models нужен DOMAIN: выбери домен в тулбаре или задай DOMAIN в .env.",
              });
              await appendServerLog("INFO", "OP_END", opId);
              await finalizeRun("Ошибка: DOMAIN не задан");
              return;
            }
            try {
              await reportRun({ ok: true, message: "START: скачиваю общий models" });
              await runScript(
                "bash",
                [
                  DOWNLOAD_SCRIPT,
                  "--skip-dealer-files",
                  "--skip-model-sections",
                  "--skip-cars",
                ],
                "Скачал общий models",
                opId,
                (msg) => errors.push(msg),
                { DOMAIN: commonDomain, JSON_REPO: jsonRepo }
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
            const commonDomain = safeDomain || String(currentDomain || "").trim();
            if (!commonDomain) {
              await reportRun({
                ok: false,
                message: "Для общего cars нужен DOMAIN: выбери домен в тулбаре или задай DOMAIN в .env.",
              });
              await appendServerLog("INFO", "OP_END", opId);
              await finalizeRun("Ошибка: DOMAIN не задан");
              return;
            }
            try {
              await reportRun({ ok: true, message: "START: скачиваю общий cars" });
              await runScript(
                "bash",
                [
                  DOWNLOAD_SCRIPT,
                  "--skip-dealer-files",
                  "--skip-model-sections",
                  "--skip-models",
                ],
                "Скачал общий cars",
                opId,
                (msg) => errors.push(msg),
                { DOMAIN: commonDomain, JSON_REPO: jsonRepo }
              );
            } catch (e: any) {
              await reportRun({ ok: false, message: e?.message ?? String(e) });
            } finally {
              await appendServerLog("INFO", "OP_END", opId);
              await finalizeRun("Общий cars");
            }
            return;
          }

          // Всё остальное требует корректный targetFile из списка и выбранный домен.
          if (!isDownloadAll && !isKnownDomainFile) {
            await reportRun({ ok: false, message: `Неизвестный файл: ${targetFile}` });
            await appendServerLog("INFO", "OP_END", opId);
            await finalizeRun("Ошибка: неизвестный файл");
            return;
          }
          if (!safeDomain) {
            await reportRun({ ok: false, message: "Домен не выбран." });
            await appendServerLog("INFO", "OP_END", opId);
            await finalizeRun("Ошибка: домен не выбран");
            return;
          }

          const filesToDownload = isDownloadAll ? domainFiles : [targetFile];
          const filesForDownloadCommand = isDownloadAll ? null : filesToDownload;
          const filesForPostScripts = isDownloadAll ? ["settings.json", "banners.json"] : filesToDownload;

          try {
            await reportRun({
              ok: true,
              message: isDownloadAll
                ? `START: скачивание всех файлов из src/${safeDomain}/data`
                : `START: скачивание (${filesToDownload.length} шт.) для домена ${safeDomain}`,
              domain: safeDomain,
            });

            const downloaded = await runDownloadCommonRepo(
              safeDomain,
              filesForDownloadCommand,
              isDownloadAll
                ? `Скачал все файлы из src/${safeDomain}/data`
                : `Скачал ${targetFile} для ${safeDomain}`,
              opId,
              (msg) => errors.push(msg),
              {
                skipModelSections: true,
                skipModels: true,
                skipCars: true,
              }
            );

            if (downloaded) {
              await runPostScriptsForFiles(filesForPostScripts, opId, (msg) => errors.push(msg));
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
