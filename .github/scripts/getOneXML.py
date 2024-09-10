# python3 .github/scripts/getOneXML.py --xpath "//data/cars/car" --output merged_cars.xml
import os
import requests
import argparse
from lxml import etree

def download_xml(url):
    response = requests.get(url)
    response.raise_for_status()  # Если возникла ошибка, будет выброшено исключение
    return response.content

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
    parser.add_argument('--xpath', default='//data/cars/car', help='XPath to the elements to be merged')
    parser.add_argument('--output', default='merged_output.xml', help='Output file name')
    args = parser.parse_args()

    # env_xml_url = os.getenv('ENV_XML_URL', '')
    env_xml_url = os.environ['ENV_XML_URL']
    urls = env_xml_url.strip().split('\r\n')

    if not urls:
        print("No URLs found in ENV_XML_URL. Please set the environment variable.")
        return

    xml_contents = [download_xml(url) for url in urls]
    merged_root = merge_xml_files(xml_contents, args.xpath)

    merged_tree = etree.ElementTree(merged_root)
    merged_tree.write(args.output, encoding="UTF-8", xml_declaration=True, pretty_print=True)

    print(f"XML files successfully downloaded and merged into {args.output}")

if __name__ == "__main__":
    main()