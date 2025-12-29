import { defineToolbarApp } from "astro/toolbar";

const APP_ID = "domain-switch";

type InitPayload = {
  presets: string[];
  currentDomain: string;
  hasJSONPath: boolean;
};
type StatusPayload = { ok: boolean; message: string; domain?: string };

export default defineToolbarApp({
  init(canvas, app, server) {
    const lsDomainsKey = `${APP_ID}:domains`;
    const lsSelectedKey = `${APP_ID}:selected`;
    const lsLogKey = `${APP_ID}:log`;

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
          /*
            Astro Dev Toolbar окно имеет ограничение по высоте (~480px).
            Если лог "растёт", он начинает выталкивать остальной UI и становится неудобно.

            Поэтому фиксируем высоту области лога и включаем прокрутку.
            Значение 203px подобрано опытным путём под текущую компоновку.
          */
          .status{
            font-size:12px;
            opacity:.9;
            white-space:pre-wrap;
            overflow-y: scroll;
            max-height: 203px;
          }
          code{font-size:12px}
        </style>
        <div class="col">
          <div class="row">
            <strong>Domain switcher</strong>
            <astro-dev-toolbar-badge id="badge"></astro-dev-toolbar-badge>
          </div>

          <div class="row" id="domainRow"></div>

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
      const renderLogFromLS = () => {
        statusEl.textContent = localStorage.getItem(lsLogKey) || "";
      };

      const clearLog = () => {
        localStorage.setItem(lsLogKey, "");
        renderLogFromLS();
      };

      const appendLog = (msg: string) => {
        const prev = localStorage.getItem(lsLogKey) || "";
        const next = prev ? `${prev}\n${msg}` : msg;
        localStorage.setItem(lsLogKey, next);
        renderLogFromLS();
      };

      const select = document.createElement("astro-dev-toolbar-select") as any;
      select.element.style.minWidth = "260px";

      const addBtn = document.createElement("astro-dev-toolbar-button") as any;
      addBtn.textContent = "Add…";
      addBtn.buttonStyle = "gray";

      domainRow.appendChild(select);
      domainRow.appendChild(addBtn);

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
          // Новый запуск -> новый лог (и новый статус).
          clearLog();
          setStatus(`Downloading ${file}…`);
          server.send(`${APP_ID}:download`, { domain, file });
        });
        return b;
      };

      // Основные действия
      actionsRow.appendChild(makeDownloadButton("Скачать всё", "__all__", "purple"));
      actionsRow.appendChild(makeDownloadButton("settings.json", "settings.json", "blue"));
      actionsRow.appendChild(makeDownloadButton("banners.json", "banners.json"));
      actionsRow.appendChild(makeDownloadButton("salons.json", "salons.json"));
      actionsRow.appendChild(makeDownloadButton("menu.json", "menu.json"));
      actionsRow.appendChild(makeDownloadButton("scripts.json", "scripts.json"));
      actionsRow.appendChild(makeDownloadButton("socials.json", "socials.json"));
      actionsRow.appendChild(makeDownloadButton("collections.json", "collections.json"));
      actionsRow.appendChild(makeDownloadButton("faq.json", "faq.json"));
      actionsRow.appendChild(makeDownloadButton("federal-disclaimer.json", "federal-disclaimer.json"));
      actionsRow.appendChild(makeDownloadButton("models-sections.yml", "models-sections.yml"));
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
        renderLogFromLS();
        const savedSelected = localStorage.getItem(lsSelectedKey) || "";
        if (Array.isArray(data.presets) && data.presets.length) {
          domains = [...data.presets, ...domains];
        }
        if (data.currentDomain) {
          domains = [data.currentDomain, ...domains];
        }

        // Если есть выбранный домен в localStorage, используем его; иначе fallback на currentDomain.
        refreshOptions(savedSelected || data.currentDomain || undefined);

        if (!data.hasJSONPath) {
          setStatus("JSON_PATH не задан на сервере. Добавь JSON_PATH в .env и перезапусти pnpm dev.", false);
          appendLog("ERR: JSON_PATH не задан на сервере. Добавь JSON_PATH в .env и перезапусти pnpm dev.");
        } else {
          setStatus("Готово. Выбери домен и нажми Download.", undefined);
          // Не добавляем это в лог, чтобы не засорять историю между реальными операциями.
        }
      });

      server.on(`${APP_ID}:status`, (data: StatusPayload) => {
        setStatus(data.message, data.ok);
        appendLog(data.message);
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
