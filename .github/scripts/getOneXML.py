import os
import requests
import argparse
from lxml import etree

def download_xml(url):
    response = requests.get(url)
    response.raise_for_status()  # Если возникла ошибка, будет выброшено исключение
    return response.content

def detect_xpath(xml_content):
    # Список известных XPath шаблонов
    xpath_patterns = [
        "//data/cars/car",
        "//vehicles/vehicle",
        "//Ads/Ad",
        "//carcopy/offers/offer"
    ]
    
    try:
        # Убрать BOM, если он присутствует
        if xml_content.startswith(b'\xef\xbb\xbf'):
            xml_content = xml_content[3:]
            
        root = etree.fromstring(xml_content)
        
        # Проверяем каждый шаблон
        for xpath in xpath_patterns:
            elements = root.xpath(xpath)
            if elements:
                print(f"Detected XPath pattern: {xpath}")
                return xpath
                
        # Если ни один шаблон не подошел
        raise ValueError("No matching XPath pattern found in XML")
        
    except etree.XMLSyntaxError as e:
        raise ValueError(f"Invalid XML content: {str(e)}")

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

def main():
    parser = argparse.ArgumentParser(description='Download and merge XML files.')
    parser.add_argument('--xpath', help='XPath to the elements to be merged (optional)')
    parser.add_argument('--output', default='cars.xml', help='Output file name')
    parser.add_argument('--split', default=' ', help='Separator')
    args = parser.parse_args()

    env_xml_url = os.environ['ENV_XML_URL']
    urls = env_xml_url.strip().split(args.split)

    if not urls:
        print("No URLs found in ENV_XML_URL. Please set the environment variable.")
        return

    xml_contents = [download_xml(url) for url in urls]
    
    # Если xpath не указан, определяем его автоматически из первого XML
    if not args.xpath:
        detected_xpath = detect_xpath(xml_contents[0])
        print(f"Using detected XPath: {detected_xpath}")
        xpath = detected_xpath
    else:
        xpath = args.xpath

    merged_root = merge_xml_files(xml_contents, xpath)

    merged_tree = etree.ElementTree(merged_root)
    merged_tree.write(args.output, encoding="UTF-8", xml_declaration=True, pretty_print=True)

    print(f"XML files successfully downloaded and merged into {args.output}")

if __name__ == "__main__":
    main()