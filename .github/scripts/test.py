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

if __name__ == "__main__":
    with open('output.txt', 'w') as file:
        file.write("")

    test_check_local_files()