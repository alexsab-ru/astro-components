# Статический хостинг: GitHub Actions, ключи и серверы

Актуально на 18 августа 2026 года. Документ относится к workflow `.github/workflows/action-pages.yml` и серверным скриптам репозитория `ghstatic` в каталоге `static/`.

## Где на GitHub находятся настройки

Для конкретного сайта откройте его репозиторий:

- `Settings → Secrets and variables → Actions → Variables` — несекретные переключатели, домены, адреса, порты и SSH host keys;
- `Settings → Secrets and variables → Actions → Secrets` — приватные SSH-ключи;
- `Settings → Environments → static-vps` или `yandex-cloud` — допустимое место для секретов конкретного deploy job, если нужны approvals или отдельные права;
- `Organization settings → Secrets and variables → Actions` — только общие значения с доступом `Selected repositories`.

Переменные `DEPLOY_TO_YC`, `YC_BUCKET`, `DEPLOY_TO_VPS` и `VPS_HOST` участвуют в `determine_targets`, где GitHub Environment ещё не выбран. Поэтому они должны быть Repository Variables или Organization Variables, доступными репозиторию. Для предсказуемости deploy variables ниже рекомендуется держать на уровне репозитория. `DOMAIN` — исключение: job `build` выбирает environment `production` или `development`, поэтому текущий рабочий вариант — Environment Variable `DOMAIN` в соответствующем environment.

`GITHUB_TOKEN` создаёт сам GitHub Actions. Добавлять его в Secrets вручную не нужно.

## Variables

| Имя | Когда нужно | Значение или назначение | Рекомендуемое место |
| --- | --- | --- | --- |
| `DOMAIN` | всегда | Канонический домен и ключ выбора данных сайта | Environment Variable `production`/`development`; допустима Repository Variable |
| `DEPLOY_TO_PAGES` | всегда | `false` отключает GitHub Pages; при пустом значении Pages разрешены, если они включены в репозитории | Repository Variable |
| `DEPLOY_TO_YC` | Object Storage | Только `true` включает синхронизацию в bucket | Repository Variable |
| `YC_BUCKET` | Object Storage | Имя bucket; должно совпадать с `DOMAIN` или `www.DOMAIN` | Repository Variable |
| `YC_DEPLOY_DRY_RUN` | Object Storage | `true` оставляет `aws s3 sync` в режиме dry-run | Repository Variable |
| `YC_SYNC_DELETE` | Object Storage | `true` удаляет из bucket объекты, которых нет в текущем `_site` | Repository Variable |
| `DEPLOY_TO_VPS` | VPS | Только `true` включает атомарный VPS deploy | Repository Variable |
| `VPS_HOST` | VPS | IP или hostname целевого сервера | Repository Variable |
| `VPS_PORT` | VPS | SSH-порт target; по умолчанию `22` | Repository Variable |
| `VPS_USER` | VPS | Ограниченный пользователь; по умолчанию `site-deploy` | Repository Variable |
| `VPS_DOMAIN` | VPS | Домен deploy; при пустом значении используется `DOMAIN` | Repository Variable |
| `VPS_KEEP_RELEASES` | VPS | Число сохраняемых релизов, по умолчанию `3` | Repository Variable |
| `VPS_KNOWN_HOSTS` | VPS | Проверенная строка host key целевого SSH-сервера | Repository Variable |
| `VPS_PROXY_HOST` | relay | Адрес SSH relay | Repository Variable |
| `VPS_PROXY_PORT` | relay | SSH-порт relay; по умолчанию `22` | Repository Variable |
| `VPS_PROXY_USER` | relay | Ограниченный пользователь `site-relay` | Repository Variable |
| `VPS_PROXY_KNOWN_HOSTS` | relay | Проверенная строка host key relay | Repository Variable |
| `VPS_HEALTHCHECK_VIA_PROXY` | relay | `true` проверяет настоящий HTTPS через relay | Repository Variable |

Пустые proxy-переменные означают прямое подключение GitHub runner к target.

## Secrets

| Имя | Назначение | Рекомендуемое место |
| --- | --- | --- |
| `VPS_SSH_PRIVATE_KEY` | Отдельный deploy key одного сайта; на target его public key привязан forced-command к этому домену | Repository Secret |
| `VPS_PROXY_SSH_PRIVATE_KEY` | Отдельный ключ relay без shell; не должен совпадать с target key | Repository Secret, только для сайтов с relay |
| `YC_ACCESS_KEY_ID` | Static access key сервисного аккаунта Object Storage | Organization Secret с `Selected repositories` или Repository Secret |
| `YC_SECRET_ACCESS_KEY` | Секретная часть того же access key | Тот же scope, что у `YC_ACCESS_KEY_ID` |
| `JSON_REPO` | Источник данных сборки; не является deploy key | Organization Secret или Repository Secret |
| `FINE_GRAINED_PAT` | Доступ к приватным данным/репозиторию во время сборки | Organization Secret с минимальным доступом или Repository Secret |

Текущее размещение:

- `YC_ACCESS_KEY_ID` и `YC_SECRET_ACCESS_KEY` — Organization Secrets с `Selected repositories`;
- `VPS_SSH_PRIVATE_KEY` — Repository Secret каждого VPS-сайта;
- `VPS_PROXY_SSH_PRIVATE_KEY` — Repository Secret только Kaiyi;
- `DOMAIN` — Environment Variable `production` у всех четырёх сайтов; у Honda и Kaiyi сейчас также есть одноимённая Repository Variable;
- environment secrets сейчас не используются.

Один target key не переиспользуется между доменами. Компрометация ключа тогда не даёт обновлять соседние сайты.

## Почему deploy-настройки не находятся в env.json

`env.json` загружается внутри job `build` только после того, как workflow:

1. выбрал Pages, Object Storage и VPS в `determine_targets`;
2. получил `DOMAIN` и скачал по нему данные сайта;
3. создал локальный `.env`.

Jobs `deploy_yc` и `deploy_vps` получают только готовый artifact `_site`; файла `src/data/site/env.json` там нет. Поэтому в `env.json` нельзя переносить:

- `DOMAIN` и `DEPLOY_TO_*`;
- `YC_*`;
- `VPS_*`;
- любые private keys.

В `env.json` остаются только site/build/runtime параметры, перечисленные в `.env.example`: feed URLs, price mappings, публичные verification values и другие значения, которые нужны после загрузки данных.

## Подключённые домены

| Домен | Репозиторий | Площадка | Web server | Текущее состояние | Автодеплой из default branch |
| --- | --- | --- | --- | --- | --- |
| `sales-autoholding-turgenevskiy.ru` | `astro-main-sales-autoholding-turgenevskiy` | Yandex Object Storage, bucket `sales-autoholding-turgenevskiy.ru` | Object Storage website hosting | Работает, `YC_SYNC_DELETE=true` | Включён через `DEPLOY_TO_YC=true` |
| `baic-krasnodar.ru` | `astro-dealer-baic-krasnodar` | VDSina `88.218.61.141` | nginx | Статический релиз работает | Включён; production run `32172982100`, attempt 2, прошёл успешно |
| `honda-krd.ru` | `astro-dealer-honda-krd` | Timeweb Cloud `185.200.243.81` | Caddy | Статический релиз работает | Включён; production run `32172995574` прошёл успешно |
| `kaiyi-krd.ru` | `astro-dealer-kaiyi-krd` | Yandex Compute Cloud `51.250.68.234` | nginx | Статический релиз работает | Включён; production run `32134618368` прошёл успешно |

Источник общей VPS-таблицы — `ghstatic/static/sites.tsv`. Строка имеет формат:

```text
domain<TAB>host<TAB>www_mode
```

Сейчас поддержан только `www_mode=none`.

## Доступ к серверам

| Сервер | Команда | Сервис | Конфиг сайта |
| --- | --- | --- | --- |
| VDSina sites | `ssh alexops@88.218.61.141` | nginx | `/etc/nginx/sites-enabled/<domain>.conf` |
| Timeweb Cloud | `ssh -p 2112 -i ~/.ssh/id_ed25519_tw_cloud_spb -o IdentitiesOnly=yes alexops@185.200.243.81` | Caddy | `/etc/caddy/sites-enabled/<domain>.caddy` |
| Yandex static-sites-prod | `yc compute ssh --id fhmot7ill5oh9uijqe1t --folder-id b1gppu6k9qsc3evfnst2 --public-address` | nginx | `/etc/nginx/sites-enabled/<domain>.conf` |

Для VDSina порт `2112` и identity уже описаны в локальном `~/.ssh/config`. Маршрут к Yandex IP зависит от VPN; при таймауте нужно сменить VPN-маршрут, а не отключать VPN полностью.

На сервере задайте путь к актуальному checkout/copy репозитория `ghstatic`:

```sh
GHSTATIC_DIR=/opt/ghstatic
DOMAIN=example.ru
```

На Timeweb постоянного checkout `/opt/ghstatic` сейчас нет. Перед изменением нужно скопировать или клонировать актуальный `ghstatic` и указать реальный `GHSTATIC_DIR`.

## Новый домен: target key и GitHub

На доверенной машине создайте отдельный ключ:

```sh
install -d -m 700 /tmp/ghstatic-example.ru
ssh-keygen -t ed25519 -C 'github-actions-deploy:example.ru' \
  -f /tmp/ghstatic-example.ru/target_ed25519
```

Public key копируется на target, затем от root выполняется:

```sh
sudo "$GHSTATIC_DIR/static/setup-deploy-target.sh" \
  "$DOMAIN" \
  /tmp/example.ru-target.pub
```

Скрипт:

- добавляет домен в `/etc/ghstatic/deploy-domains`;
- создаёт пользователя `site-deploy`;
- привязывает public key к `ghstatic-receive-release <domain>` через forced-command;
- создаёт `/srv/www/<domain>/releases`.

Перед запуском домен должен быть добавлен в `ghstatic/static/sites.tsv` на checkout, с которого запускается setup script.

В репозитории сайта настройте Variables из таблицы выше, а приватную часть ключа положите в `VPS_SSH_PRIVATE_KEY`. Host key получите через `ssh-keyscan`, но перед сохранением обязательно сверьте fingerprint через независимый admin-доступ или панель провайдера.

## Добавление nginx-сайта

Сначала создайте HTTP-конфиг до смены DNS:

```sh
sudo install -d -m 755 /etc/nginx/extras
sudo touch "/etc/nginx/extras/$DOMAIN.conf"
sudo "$GHSTATIC_DIR/static/render-site.sh" \
  "$DOMAIN" "/srv/www/$DOMAIN/current" http none \
  "/etc/nginx/sites-available/$DOMAIN.conf"
sudo ln -sfn "/etc/nginx/sites-available/$DOMAIN.conf" \
  "/etc/nginx/sites-enabled/$DOMAIN.conf"
sudo nginx -t
sudo systemctl reload nginx
```

После смены A-записи и успешной HTTP-проверки выпустите сертификат и включите HTTPS:

```sh
sudo certbot certonly --webroot -w /var/www/acme -d "$DOMAIN"
sudo "$GHSTATIC_DIR/static/render-site.sh" \
  "$DOMAIN" "/srv/www/$DOMAIN/current" https none \
  "/etc/nginx/sites-available/$DOMAIN.conf"
sudo nginx -t
sudo systemctl reload nginx
```

## Добавление Caddy-сайта

DNS должен указывать на сервер, чтобы Caddy смог выпустить сертификат:

```sh
sudo install -d -m 755 /etc/caddy/sites-enabled "/etc/caddy/extras/$DOMAIN"
sudo "$GHSTATIC_DIR/static/render-caddy-site.sh" \
  "$DOMAIN" "/srv/www/$DOMAIN/current" https \
  "/etc/caddy/sites-enabled/$DOMAIN.caddy"
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Главный `/etc/caddy/Caddyfile` должен содержать:

```caddyfile
import /etc/caddy/sites-enabled/*.caddy
```

## Relay для закрытого или нестабильного target

Relay использует другую пару ключей. На relay-сервере:

```sh
sudo "$GHSTATIC_DIR/static/setup-deploy-relay.sh" \
  "$DOMAIN" \
  51.250.68.234 \
  22 \
  /tmp/example.ru-relay.pub \
  0.0.0.0/0 \
  443
```

Этот ключ может открывать TCP только на указанные target ports `22` и `443`, не получает shell и не заменяет target deploy key. В GitHub дополнительно задаются `VPS_PROXY_*`, secret `VPS_PROXY_SSH_PRIVATE_KEY` и при необходимости `VPS_HEALTHCHECK_VIA_PROXY=true`.

## Проверка домена

На сервере:

```sh
sudo grep -Fx -- "$DOMAIN" /etc/ghstatic/deploy-domains
sudo grep -F -- "ghstatic:$DOMAIN" /var/lib/site-deploy/.ssh/authorized_keys
readlink "/srv/www/$DOMAIN/current"
find "/srv/www/$DOMAIN/releases" -mindepth 1 -maxdepth 1 -type d -print
```

nginx:

```sh
sudo nginx -t
sudo systemctl is-active nginx
```

Caddy:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl is-active caddy
```

С внешней машины, сначала через DNS, затем напрямую на нужный IP:

```sh
dig +short A "$DOMAIN"
curl --fail --silent --show-error --location \
  --output /dev/null --write-out '%{http_code} %{remote_ip}\n' \
  "https://$DOMAIN/"
curl --fail --silent --show-error \
  --resolve "$DOMAIN:443:SERVER_IP" \
  --output /dev/null --write-out '%{http_code} %{remote_ip}\n' \
  "https://$DOMAIN/"
```

GitHub:

```sh
gh variable list --repo alexsab-ru/REPOSITORY
gh secret list --repo alexsab-ru/REPOSITORY
gh run list --repo alexsab-ru/REPOSITORY --workflow action-pages.yml --limit 5
```

## Отключение или удаление домена

Сначала остановите новые публикации:

```sh
gh variable set DEPLOY_TO_VPS --body false --repo alexsab-ru/REPOSITORY
```

Для Object Storage вместо этого:

```sh
gh variable set DEPLOY_TO_YC --body false --repo alexsab-ru/REPOSITORY
```

Затем отключите vhost, сохраняя быстрый rollback.

nginx:

```sh
sudo unlink "/etc/nginx/sites-enabled/$DOMAIN.conf"
sudo nginx -t
sudo systemctl reload nginx
```

Caddy:

```sh
sudo install -d -m 755 /etc/caddy/sites-disabled
sudo mv "/etc/caddy/sites-enabled/$DOMAIN.caddy" \
  "/etc/caddy/sites-disabled/$DOMAIN.caddy"
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

После проверки другого хостинга вручную удалите ровно одну строку домена из `/etc/ghstatic/deploy-domains` и ровно одну строку с маркером `ghstatic:<domain>` из `/var/lib/site-deploy/.ssh/authorized_keys`:

```sh
sudoedit /etc/ghstatic/deploy-domains
sudoedit /var/lib/site-deploy/.ssh/authorized_keys
```

Если использовался relay, на relay-сервере удалите только строку с маркером `ghstatic-relay:<domain>`:

```sh
sudoedit /var/lib/site-relay/.ssh/authorized_keys
```

Удалите строку также из `ghstatic/static/sites.tsv`. Каталог релизов сначала перемещайте в архив, а не удаляйте:

```sh
sudo install -d -m 755 /srv/www/_disabled
sudo mv "/srv/www/$DOMAIN" "/srv/www/_disabled/$DOMAIN"
```

Сертификат и архив удаляются только после согласованного rollback-периода. Пользователей `site-deploy` и `site-relay` удалять нельзя, пока на сервере есть хотя бы один другой статический сайт.
