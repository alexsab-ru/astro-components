#!/usr/bin/env python3
"""
Mirror external car images into a deterministic CDN layout.

This module is intentionally standalone for the first integration step:
it can be run in dry-run/local mode before wiring it into update_cars.py.
"""

import argparse
import hashlib
import json
import os
import posixpath
import tempfile
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests
from PIL import Image, ImageOps


REQUEST_TIMEOUT = (8, 30)
DEFAULT_REMOTE_PREFIX = "cars"
DEFAULT_CDN_BASE_URL = "https://cdn.alexsab.ru"
DEFAULT_LOCAL_ROOT = "tmp/image_mirror"
DEFAULT_PROBE_COUNT = 3
DEFAULT_ENV_FILE = ".env"
DEFAULT_AUTOLOAD_DOWNLOAD_DELAY_SECONDS = 1.0

IMAGE_SIZES = {
    "full": 1920,
    "large": 540,
    "medium": 384,
    "small": 192,
    "thumb": 19,
}

_AVITO_AUTOLOAD_DOWNLOADS_BY_CAR: dict[tuple[str, str, str], int] = {}
_LAST_IMAGE_DOWNLOAD_AT: float | None = None
_AVITO_AUTOLOAD_BLOCKED_FOR_RUN = False


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def sha1_text(value: str, length: int = 12) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:length]


def normalize_site(value: str) -> str:
    parsed = urlparse(value if "://" in value else f"https://{value}")
    host = parsed.netloc or parsed.path
    return host.strip().lower().strip("/")


def is_avito_autoload_url(url: str) -> bool:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    return host in {"avito.ru", "www.avito.ru"} and parsed.path.startswith("/autoload/")


def normalize_cdn_base(value: str) -> str:
    return value.rstrip("/")


def remote_dir(prefix: str, site: str, category: str, vin: str) -> str:
    return posixpath.join(prefix.strip("/"), site, category, vin)


def remote_image_path(prefix: str, site: str, category: str, vin: str, index: int, filename: str) -> str:
    return posixpath.join(remote_dir(prefix, site, category, vin), str(index), filename)


def cdn_url(cdn_base_url: str, remote_path: str, version: str | None = None) -> str:
    url = f"{normalize_cdn_base(cdn_base_url)}/{remote_path.lstrip('/')}"
    return f"{url}?v={version}" if version else url


def local_path(local_root: Path, remote_path: str) -> Path:
    return local_root.joinpath(*remote_path.strip("/").split("/"))


def load_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def atomic_write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=path.parent) as tmp:
        json.dump(data, tmp, ensure_ascii=False, indent=2)
        tmp.write("\n")
        temp_name = tmp.name
    os.replace(temp_name, path)


def read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}

    values = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")
        values[key.strip()] = value

    return values


def env_value(env_file_values: dict[str, str], key: str, default: str | None = None) -> str | None:
    return os.getenv(key) or env_file_values.get(key) or default


def float_value(value: Any, default: float) -> float:
    if value is None:
        return default

    if isinstance(value, str) and not value.strip():
        return default

    return float(value)


def append_output_message(message: str) -> None:
    with open("output.txt", "a", encoding="utf-8") as file:
        file.write(message.rstrip() + "\n")


def inspect_remote_image(url: str) -> dict[str, Any]:
    response = requests.head(url, allow_redirects=True, timeout=REQUEST_TIMEOUT)
    if response.status_code >= 400:
        response.raise_for_status()

    return {
        "etag": response.headers.get("ETag") or None,
        "last_modified": response.headers.get("Last-Modified") or None,
        "content_length": response.headers.get("Content-Length") or None,
    }


def source_signature(url: str, metadata: dict[str, Any] | None = None) -> str:
    if is_avito_autoload_url(url):
        return sha1_text(f"url:{url}")

    metadata = metadata or {}
    parts = [
        f"url:{url}",
        f"etag:{metadata.get('etag') or ''}",
        f"last-modified:{metadata.get('last_modified') or ''}",
        f"content-length:{metadata.get('content_length') or ''}",
    ]
    return sha1_text("|".join(parts))


def download_image(url: str) -> Image.Image:
    response = requests.get(url, allow_redirects=True, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    image = Image.open(BytesIO(response.content))
    return ImageOps.exif_transpose(image).convert("RGB")


def resize_image(image: Image.Image, target_width: int) -> Image.Image:
    if image.width <= target_width:
        return image.copy()

    target_height = max(1, int(image.height * (target_width / image.width)))
    return image.resize((target_width, target_height), Image.Resampling.LANCZOS)


@dataclass
class MirrorConfig:
    site: str
    category: str
    cdn_base_url: str = DEFAULT_CDN_BASE_URL
    remote_prefix: str = DEFAULT_REMOTE_PREFIX
    local_root: Path = Path(DEFAULT_LOCAL_ROOT)
    probe_count: int = DEFAULT_PROBE_COUNT
    avito_autoload_max_new_per_car: int = 1
    autoload_download_delay_seconds: float = DEFAULT_AUTOLOAD_DOWNLOAD_DELAY_SECONDS
    dry_run: bool = False


@dataclass
class MirrorResult:
    image: str | None = None
    images: list[str] = field(default_factory=list)
    thumbs: list[str] = field(default_factory=list)
    image_sets: list[dict[str, str]] = field(default_factory=list)
    manifest: dict[str, Any] = field(default_factory=dict)
    changed_indexes: list[int] = field(default_factory=list)
    changed_remote_paths: list[str] = field(default_factory=list)


class ImageMirror:
    def __init__(self, config: MirrorConfig):
        self.config = config

    def avito_autoload_download_key(self, vin: str) -> tuple[str, str, str]:
        return (self.config.site, self.config.category, vin)

    def avito_autoload_downloads_for_run(self, vin: str) -> int:
        return _AVITO_AUTOLOAD_DOWNLOADS_BY_CAR.get(self.avito_autoload_download_key(vin), 0)

    def register_avito_autoload_download_for_run(self, vin: str) -> None:
        key = self.avito_autoload_download_key(vin)
        _AVITO_AUTOLOAD_DOWNLOADS_BY_CAR[key] = _AVITO_AUTOLOAD_DOWNLOADS_BY_CAR.get(key, 0) + 1

    def register_image_download_for_run(self) -> None:
        global _LAST_IMAGE_DOWNLOAD_AT

        _LAST_IMAGE_DOWNLOAD_AT = time.monotonic()

    def wait_before_image_download(self) -> None:
        if self.config.dry_run:
            return

        delay = max(0.0, float(self.config.autoload_download_delay_seconds))
        if delay <= 0:
            return

        if _LAST_IMAGE_DOWNLOAD_AT is None:
            return

        elapsed = time.monotonic() - _LAST_IMAGE_DOWNLOAD_AT
        remaining = delay - elapsed
        if remaining > 0:
            print(f"⏳ Пауза {remaining:.1f} сек перед скачиванием следующего изображения")
            time.sleep(remaining)

    def avito_autoload_blocked_for_run(self) -> bool:
        return _AVITO_AUTOLOAD_BLOCKED_FOR_RUN

    def register_avito_autoload_download_error(self, vin: str, index: int, source_url: str, error: Exception) -> None:
        global _AVITO_AUTOLOAD_BLOCKED_FOR_RUN

        _AVITO_AUTOLOAD_BLOCKED_FOR_RUN = True
        status_code = getattr(getattr(error, "response", None), "status_code", None)
        status = f" HTTP {status_code}" if status_code else ""
        message = (
            f"⚠️ Avito autoload image download failed{status}: VIN {vin}, image #{index + 1}. "
            "Новые Avito autoload изображения будут пропущены до конца запуска; "
            "для авто без сохраненных изображений будет использована цветовая заглушка. "
            f"URL: {source_url}"
        )
        print(message)
        append_output_message(message)

    def register_image_source_error(self, vin: str, index: int, source_url: str, action: str, error: Exception) -> None:
        status_code = getattr(getattr(error, "response", None), "status_code", None)
        status = f" HTTP {status_code}" if status_code else ""
        message = (
            f"⚠️ Image {action} failed{status}: VIN {vin}, image #{index + 1}. "
            "Картинка будет пропущена; если у авто не останется сохраненных изображений, "
            "будет использована цветовая заглушка. "
            f"URL: {source_url}"
        )
        print(message)
        append_output_message(message)

    def manifest_remote_path(self, vin: str) -> str:
        return posixpath.join(
            remote_dir(self.config.remote_prefix, self.config.site, self.config.category, vin),
            "manifest.json",
        )

    def manifest_local_path(self, vin: str) -> Path:
        return local_path(self.config.local_root, self.manifest_remote_path(vin))

    def build_cdn_map(self, vin: str, index: int, version: str) -> dict[str, str]:
        cdn = {}
        for size_name in IMAGE_SIZES:
            filename = f"{size_name}.webp"
            path = remote_image_path(
                self.config.remote_prefix,
                self.config.site,
                self.config.category,
                vin,
                index,
                filename,
            )
            cdn[size_name] = cdn_url(self.config.cdn_base_url, path, version)
        return cdn

    def inspect_source(self, url: str, index: int, force: bool = False) -> dict[str, Any]:
        if is_avito_autoload_url(url):
            return {"etag": None, "last_modified": None, "content_length": None}

        if index >= self.config.probe_count and not force:
            return {"etag": None, "last_modified": None, "content_length": None}

        return inspect_remote_image(url)

    def should_regenerate(self, existing: dict[str, Any] | None, url: str, version: str) -> bool:
        if existing is None:
            return True

        return (
            existing.get("source_url") != url
            or existing.get("version") != version
        )

    def existing_image_for_source(
        self,
        existing_images_by_index: dict[int, dict[str, Any]],
        existing_images_by_source_hash: dict[str, dict[str, Any]],
        index: int,
        source_url: str,
    ) -> dict[str, Any] | None:
        existing = existing_images_by_index.get(index)
        if existing and existing.get("source_url") == source_url:
            return existing

        return existing_images_by_source_hash.get(sha1_text(source_url))

    def image_remote_paths(self, vin: str, index: int) -> list[str]:
        return [
            remote_image_path(
                self.config.remote_prefix,
                self.config.site,
                self.config.category,
                vin,
                index,
                f"{size_name}.webp",
            )
            for size_name in IMAGE_SIZES
        ]

    def write_image_set(self, vin: str, index: int, source_url: str, version: str) -> list[str]:
        remote_paths = self.image_remote_paths(vin, index)

        if self.config.dry_run:
            for path in remote_paths:
                output_path = local_path(self.config.local_root, path)
                print(f"DRY-RUN write {output_path}")
            return remote_paths

        image = download_image(source_url)

        for path, (size_name, target_width) in zip(remote_paths, IMAGE_SIZES.items()):
            output_path = local_path(self.config.local_root, path)

            output_path.parent.mkdir(parents=True, exist_ok=True)
            resized = resize_image(image, target_width)
            quality = 8 if size_name == "thumb" else 86
            resized.save(output_path, "WEBP", quality=quality, method=6)

        return remote_paths

    def mirror_car_images(self, vin: str, image_urls: list[str], friendly_url: str | None = None) -> MirrorResult:
        existing_manifest = load_json(self.manifest_local_path(vin)) or {}
        existing_images = {
            int(item["index"]): item
            for item in existing_manifest.get("images", [])
            if "index" in item
        }
        existing_images_by_source_hash = {
            item.get("source_url_hash") or sha1_text(item.get("source_url", "")): item
            for item in existing_manifest.get("images", [])
            if item.get("source_url")
        }

        now = utc_now_iso()
        manifest_images = []
        changed_indexes = []
        changed_remote_paths = []

        prepared_images = []
        force_probe_all = False

        for index, source_url in enumerate(image_urls):
            source_url = source_url.strip()
            if not source_url:
                continue

            existing = self.existing_image_for_source(
                existing_images,
                existing_images_by_source_hash,
                index,
                source_url,
            )
            try:
                metadata = self.inspect_source(source_url, index)
            except requests.RequestException as error:
                self.register_image_source_error(vin, index, source_url, "inspect", error)
                if existing and isinstance(existing.get("cdn"), dict):
                    metadata = {
                        "etag": existing.get("etag"),
                        "last_modified": existing.get("last_modified"),
                        "content_length": existing.get("content_length"),
                    }
                    version = existing.get("version") or source_signature(source_url, metadata)
                    prepared_images.append({
                        "index": index,
                        "source_url": source_url,
                        "metadata": metadata,
                        "version": version,
                        "existing": existing,
                        "force_keep_existing": True,
                    })
                continue

            version = source_signature(source_url, metadata)
            if (
                existing
                and index >= self.config.probe_count
                and not is_avito_autoload_url(source_url)
                and existing.get("source_url") == source_url
            ):
                version = existing.get("version") or version
            is_changed = self.should_regenerate(existing, source_url, version)

            if is_changed and index < self.config.probe_count and not is_avito_autoload_url(source_url):
                force_probe_all = True

            prepared_images.append({
                "index": index,
                "source_url": source_url,
                "metadata": metadata,
                "version": version,
                "existing": existing,
                "force_keep_existing": False,
            })

        for item in prepared_images:
            index = item["index"]
            source_url = item["source_url"]
            metadata = item["metadata"]
            version = item["version"]
            existing = item["existing"]
            force_keep_existing = item["force_keep_existing"]

            if force_probe_all and index >= self.config.probe_count and not is_avito_autoload_url(source_url):
                try:
                    metadata = self.inspect_source(source_url, index, force=True)
                    version = source_signature(source_url, metadata)
                except requests.RequestException as error:
                    self.register_image_source_error(vin, index, source_url, "inspect", error)
                    if existing and isinstance(existing.get("cdn"), dict):
                        metadata = {
                            "etag": existing.get("etag"),
                            "last_modified": existing.get("last_modified"),
                            "content_length": existing.get("content_length"),
                        }
                        version = existing.get("version") or source_signature(source_url, metadata)
                        force_keep_existing = True
                    else:
                        continue

            regenerate = False if force_keep_existing else self.should_regenerate(existing, source_url, version)
            is_avito_autoload = is_avito_autoload_url(source_url)

            if regenerate and is_avito_autoload:
                if self.avito_autoload_blocked_for_run():
                    continue

                max_new = max(0, int(self.config.avito_autoload_max_new_per_car))
                if self.avito_autoload_downloads_for_run(vin) >= max_new:
                    continue

            cdn = (
                existing.get("cdn")
                if existing and not regenerate and isinstance(existing.get("cdn"), dict)
                else self.build_cdn_map(vin, index, version)
            )

            if regenerate:
                changed_indexes.append(index)
                self.wait_before_image_download()
                try:
                    changed_remote_paths.extend(self.write_image_set(vin, index, source_url, version))
                except requests.RequestException as error:
                    changed_indexes.pop()
                    if is_avito_autoload:
                        self.register_avito_autoload_download_error(vin, index, source_url, error)
                    else:
                        self.register_image_source_error(vin, index, source_url, "download", error)
                    continue
                self.register_image_download_for_run()
                if is_avito_autoload:
                    self.register_avito_autoload_download_for_run(vin)

            manifest_images.append({
                "index": index,
                "source_url": source_url,
                "source_url_hash": sha1_text(source_url),
                "etag": metadata.get("etag"),
                "last_modified": metadata.get("last_modified"),
                "content_length": metadata.get("content_length"),
                "version": version,
                "generated_at": now if regenerate else existing.get("generated_at"),
                "cdn": cdn,
            })

        manifest = {
            "vin": vin,
            "category": self.config.category,
            "site": self.config.site,
            "friendly_url": friendly_url,
            "last_seen_at": now,
            "images": manifest_images,
        }

        if self.config.dry_run:
            print(json.dumps(manifest, ensure_ascii=False, indent=2))
        else:
            atomic_write_json(self.manifest_local_path(vin), manifest)
        changed_remote_paths.append(self.manifest_remote_path(vin))

        images = [item["cdn"]["full"] for item in manifest_images]
        thumbs = [item["cdn"]["medium"] for item in manifest_images[:5]]
        image_sets = [item["cdn"] for item in manifest_images]
        print(
            f"🖼️ Image mirror VIN {vin}: "
            f"source={len(image_urls)}, manifest={len(manifest_images)}, "
            f"generated_sets={len(changed_indexes)}, generated_files={len(changed_indexes) * len(IMAGE_SIZES)}"
        )

        return MirrorResult(
            image=images[0] if images else None,
            images=images,
            thumbs=thumbs,
            image_sets=image_sets,
            manifest=manifest,
            changed_indexes=changed_indexes,
            changed_remote_paths=changed_remote_paths,
        )


def parse_image_urls(values: list[str]) -> list[str]:
    urls = []
    for value in values:
        for chunk in value.replace("|", "\n").splitlines():
            chunk = chunk.strip()
            if chunk:
                urls.append(chunk)
    return urls


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Mirror external car images into local CDN layout")
    parser.add_argument("--vin", required=True)
    parser.add_argument("--site", required=True, help="Site/domain bucket, for example alexsab.ru")
    parser.add_argument("--category", required=True, choices=["new", "used", "avito"])
    parser.add_argument("--friendly_url")
    parser.add_argument("--image", action="append", default=[], help="Image URL. Can be passed multiple times.")
    parser.add_argument("--images_file", help="Text file with one image URL per line")
    parser.add_argument("--local_root", default=DEFAULT_LOCAL_ROOT)
    parser.add_argument("--cdn_base_url")
    parser.add_argument("--remote_prefix", default=DEFAULT_REMOTE_PREFIX)
    parser.add_argument("--probe_count", type=int, default=DEFAULT_PROBE_COUNT)
    parser.add_argument("--avito_autoload_max_new_per_car", type=int, default=1)
    parser.add_argument(
        "--autoload_download_delay_seconds",
        type=float,
        default=float_value(
            os.getenv("MIRROR_AUTOLOAD_DOWNLOAD_DELAY_SECONDS"),
            DEFAULT_AUTOLOAD_DOWNLOAD_DELAY_SECONDS,
        ),
    )
    parser.add_argument("--env_file", default=DEFAULT_ENV_FILE)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    image_values = list(args.image)
    env_file_values = read_env_file(Path(args.env_file))

    if args.images_file:
        image_values.append(Path(args.images_file).read_text(encoding="utf-8"))

    image_urls = parse_image_urls(image_values)
    config = MirrorConfig(
        site=normalize_site(args.site),
        category=args.category,
        cdn_base_url=args.cdn_base_url
        or env_value(env_file_values, "CDN_BASE_URL")
        or env_value(env_file_values, "FTP_BASE_URL")
        or DEFAULT_CDN_BASE_URL,
        remote_prefix=args.remote_prefix,
        local_root=Path(args.local_root),
        probe_count=args.probe_count,
        avito_autoload_max_new_per_car=args.avito_autoload_max_new_per_car,
        autoload_download_delay_seconds=args.autoload_download_delay_seconds,
        dry_run=args.dry_run,
    )
    result = ImageMirror(config).mirror_car_images(args.vin, image_urls, args.friendly_url)

    print(json.dumps({
        "image": result.image,
        "images": result.images,
        "thumbs": result.thumbs,
        "image_sets": result.image_sets,
        "changed_indexes": result.changed_indexes,
        "changed_remote_paths": result.changed_remote_paths,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
