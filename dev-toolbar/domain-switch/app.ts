import { defineToolbarApp } from "astro/toolbar";

const APP_ID = "domain-switch";

type InitPayload = {
  presets: string[];
  currentDomain: string;
  hasJSONRepo: boolean;
  /**
   * Итог последнего запуска на сервере.
   *
   * Зачем:
   * - UI тулбара может перезагрузиться во время/в конце операции,
   *   и тогда часть сообщений не успеет дойти до браузера.
   * - При повторном открытии тулбара мы всё равно покажем,
   *   были ли ошибки, и какие именно.
   */
  lastRun?: {
    opId: string;
    ok: boolean;
    summary: string;
    errors: string[];
    finishedAt: string;
  } | null;
};
type StatusPayload = { ok: boolean; message: string; domain?: string; isFinal?: boolean };

type LogEntry = {
  ts: number;
  message: string;
  /**
   * null => старая история (когда мы хранили лог как просто текст).
   * Тогда подсветка невозможна, но мы всё равно показываем строки.
   */
  ok: boolean | null;
  /**
   * Финальное сообщение по операции:
   * - ok=true => подсветим зелёным (легче визуально найти конец без ошибок)
   */
  isFinal?: boolean;
};

export default defineToolbarApp({
  init(canvas, app, server) {
    const lsDomainsKey = `${APP_ID}:domains`;
    const lsSelectedKey = `${APP_ID}:selected`;
    const lsLogKey = `${APP_ID}:log`;
    const lsPreserveLogKey = `${APP_ID}:preserveLog`;
    const lsLastRunIdKey = `${APP_ID}:lastRunId`;

    let domains: string[] = [];

    const loadLS = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(lsDomainsKey) || "[]");
        if (Array.isArray(saved)) domains = saved.map(String).filter(Boolean);
      } catch {}
    };

    const saveLS = () => {
      localStorage.setItem(lsDomainsKey, JSON.stringify(domains));
    };

    const makeUI = () => {
      const win = document.createElement("astro-dev-toolbar-window");

      // Каркас
      win.innerHTML = `
        <style>
          .col{display:flex;flex-direction:column;gap:10px;min-width:360px}
          .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
          .opt{display:flex;align-items:center;gap:8px;font-size:12px;opacity:.85;user-select:none}
          .opt input{transform: translateY(1px)}
          .log-line{padding:1px 0}
          .log-line--err{color:#dc2626}
          .log-line--final-ok{color:#16a34a}
          /*
            Astro Dev Toolbar окно имеет ограничение по высоте (~480px).
            Если лог "растёт", он начинает выталкивать остальной UI и становится неудобно.

            Поэтому фиксируем максимальную высоту области лога и включаем прокрутку.
            Значение 170px подобрано опытным путём под текущую компоновку.
          */
          .status{
            font-size:12px;
            opacity:.9;
            white-space:pre-wrap;
            overflow-y: scroll;
            max-height: 170px;
          }
          code{font-size:12px}
        </style>
        <div class="col">
          <div class="row">
            <strong>Domain switcher</strong>
            <astro-dev-toolbar-badge id="badge"></astro-dev-toolbar-badge>
          </div>

          <div class="row" id="domainRow"></div>

          <div class="row" id="options"></div>

          <div class="row" id="actions"></div>

          <div class="status" id="status"></div>

          <div style="font-size:12px;opacity:.75;">
            Можно задать пресеты через <code>DOMAIN_PRESETS=...</code> в .env (через запятую) и перезапустить dev.
          </div>
        </div>
      `;

      const badge = win.querySelector("#badge") as any;
      const statusEl = win.querySelector("#status") as HTMLDivElement;
      const domainRow = win.querySelector("#domainRow") as HTMLDivElement;
      const optionsRow = win.querySelector("#options") as HTMLDivElement;
      const actionsRow = win.querySelector("#actions") as HTMLDivElement;

      /**
       * Лог храним в localStorage, а не в памяти страницы.
       *
       * Почему:
       * - при скачивании/записи файлов dev-сервер может перезагружать страницу браузера,
       *   и любая "история" в памяти UI теряется.
       * - localStorage переживает перезагрузку и позволяет показать полный лог операции.
       *
       * Важно:
       * - лог сбрасываем при каждом новом запуске (нажатии кнопки),
       *   чтобы не смешивать разные операции.
       */
      const readLogEntries = (): LogEntry[] => {
        const raw = localStorage.getItem(lsLogKey) || "";
        if (!raw) return [];

        // Новый формат: JSON-массив записей (даёт возможность подсветки).
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed
              .filter((x) => x && typeof x === "object")
              .map((x: any) => ({
                ts: typeof x.ts === "number" ? x.ts : Date.now(),
                message: String(x.message ?? ""),
                ok: typeof x.ok === "boolean" ? x.ok : null,
                isFinal: Boolean(x.isFinal),
              }))
              .filter((x) => x.message.trim().length > 0);
          }
        } catch {
          // Старый формат: простой текст.
        }

        return raw
          .split("\n")
          .map((line) => line.trimEnd())
          .filter(Boolean)
          .map((message) => ({ ts: Date.now(), message, ok: null }));
      };

      const writeLogEntries = (entries: LogEntry[]) => {
        // Защита от бесконечного роста localStorage, если долго пользоваться тулбаром.
        // 500 строк — обычно с большим запасом для одной операции.
        const capped = entries.length > 500 ? entries.slice(entries.length - 500) : entries;
        localStorage.setItem(lsLogKey, JSON.stringify(capped));
      };

      const renderLog = () => {
        const entries = readLogEntries();
        statusEl.innerHTML = "";
        for (const e of entries) {
          const div = document.createElement("div");
          div.className = "log-line";
          if (e.ok === false) div.classList.add("log-line--err");
          if (e.isFinal && e.ok === true) div.classList.add("log-line--final-ok");
          div.textContent = e.message;
          statusEl.appendChild(div);
        }

        // UX: если лог длинный — автоматически скроллим к концу.
        statusEl.scrollTop = statusEl.scrollHeight;
      };

      const clearLog = () => {
        writeLogEntries([]);
        renderLog();
      };

      const appendLog = (entry: Omit<LogEntry, "ts">) => {
        const prev = readLogEntries();
        prev.push({ ts: Date.now(), ...entry });
        writeLogEntries(prev);
        renderLog();
      };

      const select = document.createElement("astro-dev-toolbar-select") as any;
      select.element.style.minWidth = "260px";

      const addBtn = document.createElement("astro-dev-toolbar-button") as any;
      addBtn.textContent = "Add…";
      addBtn.buttonStyle = "gray";

      domainRow.appendChild(select);
      domainRow.appendChild(addBtn);

      /**
       * Preserve log:
       * - ON  => НЕ чистим UI-лог при старте и НЕ просим сервер чистить файл
       * - OFF => чистим UI-лог при старте и просим сервер стереть файл перед выполнением
       *
       * Важно: настройка хранится в localStorage и переживает перезагрузку страницы.
       */
      const preserveLabel = document.createElement("label");
      preserveLabel.className = "opt";
      preserveLabel.innerHTML = `<input type="checkbox" /> Preserve log`;
      const preserveCheckbox = preserveLabel.querySelector("input") as HTMLInputElement;
      preserveCheckbox.checked = localStorage.getItem(lsPreserveLogKey) === "1";
      preserveCheckbox.addEventListener("change", () => {
        localStorage.setItem(lsPreserveLogKey, preserveCheckbox.checked ? "1" : "0");
      });
      optionsRow.appendChild(preserveLabel);

      const makeDownloadButton = (
        label: string,
        file: string,
        style: "purple" | "blue" | "gray" = "gray",
        needsDomain = true
      ) => {
        const b = document.createElement("astro-dev-toolbar-button") as any;
        b.textContent = label;
        b.buttonStyle = style;
        b.addEventListener("click", () => {
          const domain = String(select.element.value || "").trim();
          if (needsDomain && !domain) return setStatus("Выбери домен.", false);
          const preserveLog = preserveCheckbox.checked;
          localStorage.setItem(lsPreserveLogKey, preserveLog ? "1" : "0");

          // Новый запуск -> лог чистим только если Preserve log выключен.
          if (!preserveLog) clearLog();
          setStatus(`Downloading ${file}…`);
          server.send(`${APP_ID}:download`, { domain, file, preserveLog });
        });
        return b;
      };

      // Основные действия
      actionsRow.appendChild(makeDownloadButton("Скачать всё", "__all__", "purple"));
      actionsRow.appendChild(makeDownloadButton("settings.json", "settings.json", "blue"));
      actionsRow.appendChild(makeDownloadButton("scripts.json", "scripts.json"));
      actionsRow.appendChild(makeDownloadButton("env.json", "env.json"));
      actionsRow.appendChild(makeDownloadButton("banners.json", "banners.json"));
      actionsRow.appendChild(makeDownloadButton("salons.json", "salons.json"));
      actionsRow.appendChild(makeDownloadButton("menu.json", "menu.json"));
      actionsRow.appendChild(makeDownloadButton("socials.json", "socials.json"));
      actionsRow.appendChild(makeDownloadButton("collections.json", "collections.json"));
      actionsRow.appendChild(makeDownloadButton("faq.json", "faq.json"));
      actionsRow.appendChild(makeDownloadButton("federal-disclaimer.json", "federal-disclaimer.json"));
      actionsRow.appendChild(makeDownloadButton("reviews.json", "reviews.json"));
      actionsRow.appendChild(makeDownloadButton("seo.json", "seo.json"));
      actionsRow.appendChild(makeDownloadButton("services.json", "services.json"));
      actionsRow.appendChild(makeDownloadButton("special-services.json", "special-services.json"));
      actionsRow.appendChild(makeDownloadButton("Скачать общий Models", "__common_models__", "blue", false));
      actionsRow.appendChild(makeDownloadButton("Скачать общий Cars", "__common_cars__", "blue", false));

      const setStatus = (msg: string, ok?: boolean) => {
        // Отображаем полный лог, но текущий статус всё равно важен для бейджа.
        // Сам текст сообщения добавляем в лог отдельной функцией.
        // (renderLogFromLS() вызывается из appendLog/clearLog)

        if (ok === true) {
          badge.textContent = "OK";
          badge.badgeStyle = "green";
        } else if (ok === false) {
          badge.textContent = "ERR";
          badge.badgeStyle = "red";
        } else {
          badge.textContent = "";
          badge.badgeStyle = "gray";
        }
      };

      const refreshOptions = (prefer?: string) => {
        domains = Array.from(new Set(domains.map((d) => d.trim()).filter(Boolean)));
        saveLS();

        // Перерисовываем options обычного <select> внутри кастомного элемента.
        const opts = domains.map((d) => {
          const o = document.createElement("option");
          o.value = d;
          o.textContent = d;
          return o;
        });
        select.element.replaceChildren(...opts);

        const saved = localStorage.getItem(lsSelectedKey) || "";
        const selected = prefer || saved || domains[0] || "";
        if (selected) {
          select.element.value = selected;
          localStorage.setItem(lsSelectedKey, selected);
        }
      };

      addBtn.addEventListener("click", () => {
        const d = prompt("Domain? (пример: changan.alexsab.ru)")?.trim();
        if (!d) return;
        domains.unshift(d);
        refreshOptions(d);
      });

      select.element.addEventListener("change", () => {
        localStorage.setItem(lsSelectedKey, select.element.value);
      });

      // сервер → клиент
      server.on(`${APP_ID}:init`, (data: InitPayload) => {
        loadLS();
        // При открытии панели показываем лог, который мог сохраниться после перезагрузки страницы.
        renderLog();
        const savedSelected = localStorage.getItem(lsSelectedKey) || "";
        if (Array.isArray(data.presets) && data.presets.length) {
          domains = [...data.presets, ...domains];
        }
        if (data.currentDomain) {
          domains = [data.currentDomain, ...domains];
        }

        // Если есть выбранный домен в localStorage, используем его; иначе fallback на currentDomain.
        refreshOptions(savedSelected || data.currentDomain || undefined);

        /**
         * Показываем итог последнего запуска с сервера, если:
         * - он есть
         * - и мы ещё не показывали именно этот opId (чтобы не дублировать при каждом открытии)
         */
        if (data.lastRun?.opId) {
          const shownId = localStorage.getItem(lsLastRunIdKey) || "";
          if (shownId !== data.lastRun.opId) {
            appendLog({
              ok: data.lastRun.ok,
              isFinal: true,
              message: `LAST RUN: ${data.lastRun.summary} (${data.lastRun.finishedAt})`,
            });
            if (Array.isArray(data.lastRun.errors) && data.lastRun.errors.length) {
              for (const err of data.lastRun.errors) {
                appendLog({ ok: false, message: `ERR: ${err}` });
              }
            }
            localStorage.setItem(lsLastRunIdKey, data.lastRun.opId);
          }
        }

        if (!data.hasJSONRepo) {
          setStatus("JSON_REPO не задан на сервере. Добавь JSON_REPO в .env и перезапусти pnpm dev.", false);
          appendLog({
            ok: false,
            message: "ERR: JSON_REPO не задан на сервере. Добавь JSON_REPO в .env и перезапусти pnpm dev.",
          });
        } else {
          setStatus("Готово. Выбери домен и нажми нужную кнопку скачивания.", undefined);
          // Не добавляем это в лог, чтобы не засорять историю между реальными операциями.
        }
      });

      server.on(`${APP_ID}:status`, (data: StatusPayload) => {
        setStatus(data.message, data.ok);
        appendLog({ ok: data.ok, message: data.message, isFinal: Boolean(data.isFinal) });
        if (data.ok && data.domain) {
          localStorage.setItem(lsSelectedKey, data.domain);
        }
      });

      // handshake
      server.send(`${APP_ID}:hello`, {});

      return win;
    };

    // Рендерим/чистим по toggle
    app.onToggled(({ state }) => {
      canvas.innerHTML = "";
      if (state) canvas.appendChild(makeUI());
    });
  },
});
