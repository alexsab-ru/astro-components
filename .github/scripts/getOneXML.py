# python3 .github/scripts/getOneXML.py --xpath "//data/cars/car" --output merged_cars.xml
import os
import requests
import argparse
from lxml import etree

def download_xml(url):
    response = requests.get(url)
    return response.content

def merge_xml_files(xml_contents, xpath):
    merged_root = etree.Element("merged_data")
    
    for content in xml_contents:
        root = etree.fromstring(content)
        elements = root.xpath(xpath)
        for element in elements:
            merged_root.append(element)
    
    return merged_root

def main():
    parser = argparse.ArgumentParser(description='Download and merge XML files.')
    parser.add_argument('--xpath', default='//car', help='XPath to the elements to be merged')
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