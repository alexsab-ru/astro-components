#!/usr/bin/env python3
"""
Ищет английские слова в собранном сайте (./_site).
Запускать после `pnpm build --outDir ./_site`.

Использование:
    python3 .github/scripts/findEnglishWords.py
    DOMAIN=example.ru python3 .github/scripts/findEnglishWords.py

Вывод: таблица с разделителем TAB:
    слово [TAB] url1, url2, ...
"""

import json
import os
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup
from collections import defaultdict


# Латинские слова:
#   - с дефисами/точками внутри (Wi-Fi, e-mail, cdn.alexsab.ru)
#   - обычные слова 2+ букв
ENGLISH_WORD_RE = re.compile(
    r'(?<!\w)[a-zA-Z][a-zA-Z0-9]*(?:[-\.][a-zA-Z][a-zA-Z0-9]*)+(?!\w)'  # Wi-Fi, alexsab.ru
    r'|\b[a-zA-Z]{2,}\b'  # обычные слова
)

# Теги, содержимое которых не нужно анализировать
SKIP_TAGS = {'script', 'style', 'noscript', 'head', 'a'}


def file_path_to_url(html_file: Path, site_dir: Path, domain: str) -> str:
    """Преобразовать путь HTML-файла в URL."""
    rel = html_file.relative_to(site_dir)
    parts = rel.parts

    # index.html в корне → /
    if parts == ('index.html',):
        slug = '/'
    # subdir/index.html → /subdir/
    elif parts[-1] == 'index.html':
        slug = '/' + '/'.join(parts[:-1]) + '/'
    # page.html → /page/
    else:
        slug = '/' + '/'.join(parts[:-1] + (rel.stem,)) + '/'

    if domain:
        return f"https://{domain}{slug}"
    return slug


def is_redirect_page(html: str) -> bool:
    """Проверить, является ли страница редиректом (title начинается с 'Redirecting to:')."""
    soup = BeautifulSoup(html, 'html.parser')
    title = soup.find('title')
    return title is not None and title.get_text().startswith('Redirecting to:')


def extract_visible_text(html: str) -> str:
    """Извлечь видимый текст из HTML."""
    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup(SKIP_TAGS):
        tag.decompose()
    return soup.get_text(separator=' ')


def find_english_words(text: str) -> set:
    return {w.lower() for w in ENGLISH_WORD_RE.findall(text)}


def load_skip_words(settings_path: Path) -> set:
    """Загрузить список игнорируемых слов из settings-common.json."""
    if not settings_path.exists():
        return set()
    try:
        data = json.loads(settings_path.read_text(encoding='utf-8'))
        return {w.lower() for w in data.get('skip_english_words', [])}
    except Exception as e:
        print(f"[WARN] Не удалось прочитать skip_english_words из {settings_path}: {e}", file=sys.stderr)
        return set()


def load_dotenv(env_path: Path = Path('.env')) -> dict:
    """Прочитать переменные из .env файла."""
    if not env_path.exists():
        return {}
    result = {}
    for line in env_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, val = line.partition('=')
        result[key.strip()] = val.strip().strip('"').strip("'")
    return result


def main():
    site_dir = Path(os.environ.get('SITE_DIR', '_site')).resolve()
    domain = os.environ.get('DOMAIN', '').strip().rstrip('/')
    if not domain:
        domain = load_dotenv().get('DOMAIN', '').strip().rstrip('/')
    if domain:
        print(f"[INFO] Домен: {domain}", file=sys.stderr)

    settings_path = Path('src/data/settings-common.json')
    skip_words = load_skip_words(settings_path)
    if skip_words:
        print(f"[INFO] Игнорируем слова: {', '.join(sorted(skip_words))}", file=sys.stderr)

    if not site_dir.is_dir():
        print(f"[ERR] Директория не найдена: {site_dir}", file=sys.stderr)
        print("[ERR] Сначала выполните: pnpm build --outDir ./_site", file=sys.stderr)
        sys.exit(1)

    html_files = sorted(site_dir.rglob('*.html'))
    if not html_files:
        print(f"[ERR] HTML-файлы не найдены в {site_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Найдено {len(html_files)} HTML-файлов в {site_dir}", file=sys.stderr)

    # word -> set of URLs
    word_urls = defaultdict(set)

    for i, html_file in enumerate(html_files, 1):
        url = file_path_to_url(html_file, site_dir, domain)
        print(f"[{i}/{len(html_files)}] {url}", file=sys.stderr)

        try:
            html = html_file.read_text(encoding='utf-8', errors='ignore')
        except Exception as e:
            print(f"[ERR] Не удалось прочитать {html_file}: {e}", file=sys.stderr)
            continue

        if is_redirect_page(html):
            print(f"  → пропускаем (redirect)", file=sys.stderr)
            continue

        text = extract_visible_text(html)
        for word in find_english_words(text):
            if word not in skip_words:
                word_urls[word].add(url)

    if not word_urls:
        print("[INFO] Английские слова не найдены", file=sys.stderr)
        return

    sorted_words = sorted(word_urls.keys())

    # Markdown-таблица в консоль
    print("\n")
    print("| word | count | url |")
    print("|-------|--------|-----|")
    for word in sorted_words:
        urls = sorted(word_urls[word])
        print(f"| {word} | {len(urls)} | {', '.join(urls)} |")
    print("\n")

    notifications_dir = Path('tmp/notifications')
    notifications_dir.mkdir(parents=True, exist_ok=True)
    stem = f"english-words-{domain}" if domain else "english-words"

    # TSV — удобен для локального просмотра
    tsv_path = notifications_dir / f"{stem}.tsv"
    with tsv_path.open('w', encoding='utf-8') as f:
        f.write("word\tcount\turl\n")
        for word in sorted_words:
            urls = sorted(word_urls[word])
            f.write(f"{word}\t{len(urls)}\t{', '.join(urls)}\n")
    print(f"[INFO] TSV сохранён: {tsv_path}", file=sys.stderr)

    # CSV — отправляется в Telegram
    csv_path = notifications_dir / f"{stem}.csv"
    with csv_path.open('w', encoding='utf-8') as f:
        f.write("word,count,url\n")
        for word in sorted_words:
            urls = sorted(word_urls[word])
            urls_cell = '; '.join(urls)
            f.write(f"{word},{len(urls)},{urls_cell}\n")
    print(f"[INFO] CSV сохранён: {csv_path}", file=sys.stderr)

    print(f"[INFO] Всего уникальных английских слов: {len(sorted_words)}", file=sys.stderr)


if __name__ == '__main__':
    main()
