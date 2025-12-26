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
          .status{font-size:12px;opacity:.9;white-space:pre-wrap}
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
      actionsRow.appendChild(makeDownloadButton("Скачать общий Models", "__common_models__", "gray", false));
      actionsRow.appendChild(makeDownloadButton("Скачать общий cars", "__common_cars__", "gray", false));

      const setStatus = (msg: string, ok?: boolean) => {
        statusEl.textContent = msg;

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
        } else {
          setStatus("Готово. Выбери домен и нажми Download.", undefined);
        }
      });

      server.on(`${APP_ID}:status`, (data: StatusPayload) => {
        setStatus(data.message, data.ok);
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
