#!/usr/bin/env python
import os
import xml.etree.ElementTree as ET
from utils import *

def test_check_local_files():
    # Тест 1: Существующий бренд и модель
    print("\nТест 1: Существующий бренд и модель")
    result = check_local_files('Geely', 'Atlas Pro', 'Черный', 'WBA12345678901234')
    print(f"Результат: {result}")

    # Тест 2: Несуществующий бренд
    print("\nТест 2: Несуществующий бренд")
    result = check_local_files('NonExistentBrand', 'Atlas Pro', 'Черный', 'WBA12345678901234')
    print(f"Результат: {result}")

    # Тест 3: Несуществующая модель
    print("\nТест 3: Несуществующая модель")
    result = check_local_files('Geely', 'NonExistentModel', 'Черный', 'WBA12345678901234')
    print(f"Результат: {result}")

    # Тест 4: Несуществующий цвет
    print("\nТест 4: Несуществующий цвет")
    result = check_local_files('Geely', 'Atlas Pro', 'НесуществующийЦвет', 'WBA12345678901234')
    print(f"Результат: {result}")

def test_cdn_check(brand, folder, color_image):
    print("\nТест 5: Проверка CDN")
    cdn_path = f"https://cdn.alexsab.ru/b/{brand.lower()}/img/models/{folder}/colors/{color_image}"
    try:
        response = requests.head(cdn_path)
        if response.status_code == 200:
            print(f"Файл найден на CDN: {cdn_path}")
        else:
            # Если файл не найден в CDN, проверяем локальные файлы
            errorText = f"\nНе удалось найти файл на CDN. Статус <b>{response.status_code}</b>\n<pre>{color_image}</pre>\n<a href='{cdn_path}'>{cdn_path}</a>"
            print_message(errorText, 'error')

    except requests.RequestException as e:
        # В случае ошибки при проверке CDN, используем локальные файлы
        errorText = f"\nОшибка при проверке CDN: {str(e)}"
        print_message(errorText, 'error')

if __name__ == "__main__":
    with open('output.txt', 'w') as file:
        file.write("")

    test_check_local_files()
    test_cdn_check('Geely', 'atlaspro', 'black.webp')