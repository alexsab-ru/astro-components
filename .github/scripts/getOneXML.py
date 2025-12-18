#!/usr/bin/env python
import os
import time
import requests
import argparse
from lxml import etree
from requests.exceptions import ConnectionError, Timeout


def download_or_read_file(path, retries=3, delay=5):
    """Скачать XML по URL или прочитать локальный файл с обработкой повторных попыток."""
    if os.path.isfile(path):
        with open(path, 'rb') as file:
            return file.read()

    if path.startswith('http://') or path.startswith('https://'):
        for attempt in range(retries):
            try:
                response = requests.get(path, timeout=10)  # Установим тайм-аут
                response.raise_for_status()
                return response.content
            except (ConnectionError, Timeout) as e:
                print(f"Attempt {attempt + 1} failed: {e}")
                if attempt < retries - 1:
                    time.sleep(delay)  # Ждем перед повторной попыткой
                else:
                    raise
    
    return None

def detect_xpath(xml_content, url):
    # Список известных XPath шаблонов (паттерн: xpath, родительский путь для проверки структуры)
    xpath_patterns = [
        ("//data/cars/car", "//data/cars"),
        ("//catalog/vehicles/vehicle", "//catalog/vehicles"),
        ("//vehicles/vehicle", "//vehicles"),
        ("//Ads/Ad", "//Ads"),
        ("//carcopy/offers/offer", "//carcopy/offers"),
        ("//yml_catalog/shop/offers/offer", "//yml_catalog/shop/offers")
    ]
    
    try:
        # Убрать BOM, если он присутствует
        if xml_content.startswith(b'\xef\xbb\xbf'):
            xml_content = xml_content[3:]
            
        root = etree.fromstring(xml_content)
        
        # Сначала проверяем каждый шаблон на наличие элементов
        for xpath, parent_xpath in xpath_patterns:
            elements = root.xpath(xpath)
            if elements:
                print(f"Detected XPath pattern: {xpath}")
                return xpath
        
        # Если элементов нет, пробуем определить по структуре (пустые контейнеры)
        for xpath, parent_xpath in xpath_patterns:
            parent_elements = root.xpath(parent_xpath)
            if parent_elements:
                # Нашли подходящую структуру, но она пуста
                warning_msg = f"⚠️ XML файл {url} содержит структуру {parent_xpath}, но не содержит данных (пустой)"
                print(warning_msg)
                # Записываем предупреждение в output.txt
                # with open('output.txt', 'a', encoding='utf-8') as file:
                #     file.write(f"\n{warning_msg}\n")
                return xpath
                
        # Если вообще ничего не подошло
        error_msg = "❌ Не удалось определить структуру XML {url} - ни один из известных XPath паттернов не найден"
        print(error_msg)
        # Записываем ошибку в output.txt
        with open('output.txt', 'a', encoding='utf-8') as file:
            file.write(f"\n{error_msg}\n")
        # Возвращаем первый паттерн по умолчанию, чтобы не останавливать выполнение
        return xpath_patterns[0][0]
        
    except etree.XMLSyntaxError as e:
        error_msg = f"❌ Невалидный XML контент {url}: {str(e)}"
        print(error_msg)
        with open('output.txt', 'a', encoding='utf-8') as file:
            file.write(f"\n{error_msg}\n")
        raise ValueError(error_msg)

def merge_xml_files(xml_contents, xpath):
    # Определяем путь до родительского элемента для объединения
    path = xpath.strip('/').split('/')[:-1]
    root_path = path[0]
    parent_path = '/'.join(path[1:])

    # Создаем корневой элемент на основе родительского пути
    merged_root = etree.Element(root_path)

    for content in xml_contents:
        # Убрать BOM, если он присутствует
        if content.startswith(b'\xef\xbb\xbf'):
            content = content[3:]

        # Декодируем содержимое из байтов в строку
        # content = content.decode('utf-8')
        root = etree.fromstring(content)
        
        # Находим элементы для объединения на основе полного XPATH
        elements = root.xpath(xpath)
        
        # Находим или создаем нужную структуру родителя
        parent_elements = merged_root.xpath(parent_path) if parent_path else [merged_root]
        
        # Если родитель не найден, создаем его
        if not parent_elements:
            parent_element = merged_root
            for tag in parent_path.split('/'):
                new_element = etree.Element(tag)
                parent_element.append(new_element)
                parent_element = new_element
            parent_elements = [parent_element]
        
        for element in elements:
            # Добавляем элементы в соответствующую родительскую структуру
            parent_elements[0].append(element)
    
    return merged_root

def remove_duplicates(root, xpath, attribute="VIN"):
    """Удаление дубликатов элементов по значению атрибута (например, VIN)."""
    unique_values = set()
    elements_to_remove = []
    
    elements = root.xpath(xpath)
    print(f"Found {len(elements)} elements with XPath '{xpath}'")
    
    for element in elements:
        # Поиск VIN в атрибутах (учитываем разный регистр)
        for attr_name in [attribute.lower(), attribute.upper()]:
            vin_attr = element.get(attr_name)
            if vin_attr:
                print(f"Found VIN as attribute: {vin_attr}")
                if vin_attr in unique_values:
                    elements_to_remove.append(element)
                else:
                    unique_values.add(vin_attr)
                break  # Переход к следующему элементу

        # Поиск VIN как вложенного элемента (учитываем разный регистр)
        for vin_tag in [attribute.lower(), attribute.upper()]:
            vin_element = element.xpath(f'.//{vin_tag}')
            if vin_element:
                vin_text = vin_element[0].text.strip() if vin_element[0].text else None
                print(f"Found VIN as nested element: {vin_text}")
                if vin_text and vin_text in unique_values:
                    elements_to_remove.append(element)
                else:
                    unique_values.add(vin_text)
                break  # Переход к следующему элементу

        else:
            # Если ничего не найдено, логируем элемент
            print(f"VIN not found in element: {etree.tostring(element, pretty_print=True).decode()}")
    
    # Удаляем дубликаты
    for element in elements_to_remove:
        parent = element.getparent()
        if parent is not None:
            parent.remove(element)
    
    print(f"Removed {len(elements_to_remove)} duplicate elements based on attribute '{attribute}'.")
    return root

def main():
    parser = argparse.ArgumentParser(description='Download and merge XML files.')
    parser.add_argument('--xpath', help='XPath to the elements to be merged (optional)')
    parser.add_argument('--output_path', default='cars.xml', help='Output file name')
    parser.add_argument('--xml_url', default=os.getenv('XML_URL', ''), help='XML URL')
    parser.add_argument('--split', default=' ', help='Separator')
    parser.add_argument('--urls', nargs='*', help='List of XML URLs to download')
    args = parser.parse_args()

    # Используем переменную окружения, если она задана
    env_urls = args.xml_url.strip().split(args.split)

    # Объединяем URL из переменной окружения и аргументов командной строки
    urls = env_urls + (args.urls if args.urls else [])

    if not urls:
        print("No URLs provided. Please specify them using --urls or XML_URL.")
        return

    # Собираем только успешно полученные XML (None пропускаем, чтобы не падать)
    xml_contents = [
        content for content in (download_or_read_file(url) for url in urls) if content is not None
    ]
    # Если ничего не скачалось/не прочиталось, выходим раньше, чтобы не падать на xml_contents[0]
    if not xml_contents:
        warning_msg = "⚠️ Ни один XML не удалось получить. Проверьте URL или доступность файлов."
        print(warning_msg)
        with open('output.txt', 'a', encoding='utf-8') as file:
            file.write(f"{warning_msg}\n")
        return
    
    # Если xpath не указан, определяем его автоматически из первого XML
    if not args.xpath:
        detected_xpath = detect_xpath(xml_contents[0], urls[0])
        print(f"Using detected XPath: {detected_xpath}")
        xpath = detected_xpath
    else:
        xpath = args.xpath

    merged_root = merge_xml_files(xml_contents, xpath)
    deduplicated_root = remove_duplicates(merged_root, xpath)

    # Подсчитываем финальное количество элементов
    final_elements = deduplicated_root.xpath(xpath)
    final_count = len(final_elements)
    
    # Если финальный файл пустой, записываем предупреждение
    if final_count == 0:
        warning_msg = f"⚠️ Результирующий XML файл {args.output_path} не содержит данных (0 элементов)"
        print(warning_msg)
        with open('output.txt', 'a', encoding='utf-8') as file:
            file.write(f"{warning_msg}\n")

    merged_tree = etree.ElementTree(deduplicated_root)
    # Создаём директории для output_path, если их нет
    output_dir = os.path.dirname(args.output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    merged_tree.write(args.output_path, encoding="UTF-8", xml_declaration=True, pretty_print=True)

    print(f"\033[30;42mXML files successfully downloaded and merged into {args.output_path} ({final_count} elements)\033[0m")

if __name__ == "__main__":
    main()