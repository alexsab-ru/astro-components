# python3 .github/scripts/getOneXML.py --xpath "//data/cars/car" --output merged_cars.xml
import os
import requests
import argparse
from lxml import etree

def download_xml(url):
    response = requests.get(url)
    return response.content

def find_or_create_parent(root, path):
    current = root
    for tag in path.split('/'):
        if not tag:  # пропускаем пустые строки (например, при начальном '/')
            continue
        child = current.find(tag)
        if child is None:
            child = etree.SubElement(current, tag)
        current = child
    return current

def merge_xml_files(xml_contents, xpath):
    # Разбиваем XPath на путь к родительскому элементу и имя конечного элемента
    parts = xpath.split('/')
    parent_path = '/'.join(parts[:-1])
    child_name = parts[-1]
    
    # Используем первый XML в качестве основы для объединенного документа
    merged_root = etree.fromstring(xml_contents[0])
    
    # Находим или создаем родительский элемент в объединенном документе
    parent_element = find_or_create_parent(merged_root, parent_path)
    
    # Удаляем все существующие дочерние элементы с именем child_name из родительского элемента
    for child in parent_element.findall(child_name):
        parent_element.remove(child)
    
    # Объединяем элементы из всех XML файлов
    for content in xml_contents:
        root = etree.fromstring(content)
        elements = root.xpath(xpath)
        for element in elements:
            parent_element.append(element)
    
    return merged_root

def main():
    parser = argparse.ArgumentParser(description='Download and merge XML files.')
    parser.add_argument('--xpath', default='//data/cars/car', help='XPath to the elements to be merged')
    parser.add_argument('--output', default='merged_output.xml', help='Output file name')
    args = parser.parse_args()

    env_xml_url = os.getenv('ENV_XML_URL', '')
    urls = env_xml_url.strip().split('\n')

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