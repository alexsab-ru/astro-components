#!/usr/bin/env python3

"""
Скрипт для скачивания данных о комплектациях и ценах из Google Таблицы.
Преобразует данные в JSON формат и сохраняет в корень проекта.
"""

import csv
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any
from urllib.request import urlopen
from urllib.error import URLError

# Индексы колонок (A=0, B=1, C=2, D=3, E=4, F=5)
COLUMN_MARK_ID = 0      # A - mark_id (бренд)
COLUMN_MODEL_ID = 1     # B - model_id (ID модели)
COLUMN_MODEL_NAME = 2   # C - model_name (название модели)
COLUMN_COMPLECTATION_NAME = 3  # D - complectation name (название комплектации)
COLUMN_PRICE = 4        # E - price (цена)
COLUMN_BENEFIT = 5      # F - benefit (выгода)

# Путь для сохранения результата
OUTPUT_FILENAME = "complectations-prices.json"

# Корень проекта (2 уровня вверх от текущего скрипта: .github/scripts -> root)
PROJECT_ROOT = Path(__file__).parent.parent.parent

# Директория для сохранения данных
DATA_DIR = PROJECT_ROOT / "src" / "data"

# Путь к файлу настроек
SETTINGS_PATH = DATA_DIR / "settings.json"

def load_env_config() -> Dict[str, str]:
    """
    Загружает конфигурацию из .env файла.
    Простой парсер без дополнительных зависимостей.
    
    Returns:
        Словарь с конфигурацией
    """
    env_path = PROJECT_ROOT / '.env'
    config = {}
    
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Пропускаем пустые строки и комментарии
                if not line or line.startswith('#'):
                    continue
                # Парсим KEY=VALUE
                if '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
    
    return config

def load_brands_from_settings() -> List[str]:
    """
    Загружает список брендов из settings.json.
    Поле brand может содержать один бренд или несколько через запятую.
    Например: "WEY" или "WEY,Toyota" или "WEY, Toyota"
    
    Returns:
        Список брендов
    """
    print("Загрузка брендов из settings.json...")
    
    try:
        if not SETTINGS_PATH.exists():
            print(f"⚠ Файл {SETTINGS_PATH} не найден. Будут использованы все бренды.")
            return []
        
        with open(SETTINGS_PATH, 'r', encoding='utf-8') as f:
            settings = json.load(f)
        
        brand_value = settings.get('brand')
        
        if not brand_value:
            print("⚠ Поле 'brand' не найдено в settings.json. Будут использованы все бренды.")
            return []
        
        if not isinstance(brand_value, str):
            print(f"⚠ Неожиданный тип поля 'brand': {type(brand_value)}. Будут использованы все бренды.")
            return []
        
        # Разделяем по запятой и убираем пробелы
        brands = [brand.strip() for brand in brand_value.split(',') if brand.strip()]
        
        if not brands:
            print("⚠ Поле 'brand' пустое. Будут использованы все бренды.")
            return []
        
        print(f"✓ Загружены бренды: {', '.join(brands)}")
        return brands
        
    except Exception as e:
        print(f"⚠ Ошибка при чтении settings.json: {e}. Будут использованы все бренды.")
        return []

def convert_to_export_url(url: str) -> str:
    """Преобразует URL Google Sheets из формата edit в export (CSV)"""
    import re
    
    # Извлекаем spreadsheet ID
    match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', url)
    if not match:
        raise ValueError(f"Не удалось извлечь ID таблицы из URL: {url}")
    
    spreadsheet_id = match.group(1)
    
    # Извлекаем gid
    gid_match = re.search(r'[?&#]gid=([0-9]+)', url)
    gid = gid_match.group(1) if gid_match else '0'
    
    # Формируем URL для экспорта
    return f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=csv&gid={gid}"


ENV_CONFIG = load_env_config()


raw_url = ENV_CONFIG.get('COMPLECTATIONS_PRICE_CSV_URL')
if not raw_url:
    raise ValueError(
        "Переменная COMPLECTATIONS_PRICE_CSV_URL не найдена в .env файле. "
        "Добавьте в .env: COMPLECTATIONS_PRICE_CSV_URL=https://docs.google.com/.../export?format=csv&gid=..."
    )

EXPORT_CSV_URL = convert_to_export_url(raw_url)

def download_spreadsheet_data(url: str) -> List[List[str]]:
    """
    Скачивает данные из Google Таблицы в формате CSV.
    
    Args:
        url: URL для экспорта таблицы в CSV
        
    Returns:
        Список строк, где каждая строка - это список значений колонок
        
    Raises:
        URLError: Если не удалось скачать данные
        Exception: Другие ошибки при скачивании
    """
    print(f"Скачивание данных из Google Таблицы...")
    
    try:
        with urlopen(url) as response:
            # Читаем данные и декодируем из UTF-8
            csv_data = response.read().decode('utf-8')
            
        # Парсим CSV
        csv_reader = csv.reader(csv_data.splitlines())
        data = list(csv_reader)
        
        print(f"✓ Успешно скачано {len(data)} строк")
        return data
        
    except URLError as e:
        print(f"✗ Ошибка при скачивании: {e}")
        raise
    except Exception as e:
        print(f"✗ Неожиданная ошибка: {e}")
        raise


def transform_to_json(data: List[List[str]], allowed_brands: List[str] = None) -> Dict[str, List[Dict[str, Any]]]:
    """
    Преобразует данные из CSV в JSON формат с группировкой по брендам и моделям.
    
    Структура результата:
    {
        "Belgee": [
            {
                "model_name": "S50",
                "model_id": "s50",
                "complectations": [
                    {"name": "Active 5MT", "price": "1849990", "benefit": "200000"},
                    ...
                ]
            },
            ...
        ],
        ...
    }
    
    Args:
        data: Список строк из CSV (первая строка - заголовки)
        allowed_brands: Список разрешенных брендов (None = все бренды)
        
    Returns:
        Объект с брендами, моделями и комплектациями
    """
    print("Преобразование данных в JSON...")
    
    # Пропускаем заголовок (первая строка)
    rows = data[1:] if len(data) > 1 else []
    
    brands_dict: Dict[str, Dict[str, Dict[str, Any]]] = {}
    
    for row in rows:
        # Пропускаем пустые строки
        if not row or len(row) < 6:
            continue
            
        # Извлекаем значения
        mark_id = row[COLUMN_MARK_ID].strip() if len(row) > COLUMN_MARK_ID else ""
        model_id = row[COLUMN_MODEL_ID].strip() if len(row) > COLUMN_MODEL_ID else ""
        model_name = row[COLUMN_MODEL_NAME].strip() if len(row) > COLUMN_MODEL_NAME else ""
        complectation_name = row[COLUMN_COMPLECTATION_NAME].strip() if len(row) > COLUMN_COMPLECTATION_NAME else ""
        price_str = row[COLUMN_PRICE].strip() if len(row) > COLUMN_PRICE else ""
        benefit_str = row[COLUMN_BENEFIT].strip() if len(row) > COLUMN_BENEFIT else ""
        
        # Пропускаем строки без обязательных данных
        if not mark_id or not model_id or not model_name:
            continue
        
        # Фильтрация по брендам
        if allowed_brands and mark_id not in allowed_brands:
            continue
        
        # Инициализируем бренд, если его еще нет
        if mark_id not in brands_dict:
            brands_dict[mark_id] = {}
        
        # Инициализируем модель, если ее еще нет
        if model_id not in brands_dict[mark_id]:
            brands_dict[mark_id][model_id] = {
                "model_name": model_name,
                "complectations": []
            }
        
        # Добавляем комплектацию, если есть название
        if complectation_name:
            complectation = {
                "name": complectation_name,
                "price": price_str,
                "benefit": benefit_str
            }
            brands_dict[mark_id][model_id]["complectations"].append(complectation)
    
    # Преобразуем в финальную структуру
    result: Dict[str, List[Dict[str, Any]]] = {}
    
    for mark_id, models in brands_dict.items():
        result[mark_id] = []
        
        for model_id, model_data in models.items():
            # Создаем объект модели
            model_obj = {
                "model_name": model_data["model_name"],
                "model_id": model_id,
                "complectations": model_data["complectations"]
            }
            result[mark_id].append(model_obj)
    
    # Подсчет статистики
    total_models = sum(len(models) for models in result.values())
    total_complectations = sum(
        len(model["complectations"])
        for brand_models in result.values()
        for model in brand_models
    )
    
    brands_info = f" (отфильтровано по брендам: {', '.join(allowed_brands)})" if allowed_brands else ""
    print(f"✓ Обработано {len(result)} брендов, {total_models} моделей, {total_complectations} комплектаций{brands_info}")
    return result


def save_json_file(data: Dict[str, Any], output_path: Path) -> None:
    print(f"Сохранение данных в {output_path}...")
    
    try:
        # Создаем директорию, если не существует
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Сохраняем с отступами для читаемости
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"✓ Файл успешно сохранен: {output_path}")
        
    except Exception as e:
        print(f"✗ Ошибка при сохранении файла: {e}")
        raise


def main() -> int:
    """
    Главная функция для выполнения всего процесса.
    
    Returns:
        Код возврата: 0 - успех, 1 - ошибка
    """
    print("=" * 70)
    print("СКАЧИВАНИЕ ДАННЫХ О КОМПЛЕКТАЦИЯХ И ЦЕНАХ")
    print("=" * 70)
    
    try:
        # 1. Загружаем список разрешенных брендов
        allowed_brands = load_brands_from_settings()
        
        # 2. Скачиваем данные
        raw_data = download_spreadsheet_data(EXPORT_CSV_URL)
        
        # 3. Преобразуем в JSON с фильтрацией по брендам
        json_data = transform_to_json(raw_data, allowed_brands if allowed_brands else None)
        
        # 4. Сохраняем файл
        output_path = DATA_DIR / OUTPUT_FILENAME
        save_json_file(json_data, output_path)
        
        print("✓ ГОТОВО!")
        return 0
        
    except Exception as e:
        print(f"✗ ОШИБКА: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())