import os
import argparse
from utils import *
import xml.etree.ElementTree as ET


def process_car(car: ET.Element, existing_files: set, current_thumbs, prices_data, elements_to_localize, config) -> None:
    """
    Обрабатывает данные отдельной машины.
    
    Args:
        car: XML элемент машины
        existing_files: Множество существующих файлов
        current_thumbs: Список путей к текущим превьюшкам
        prices_data: Данные о ценах
        elements_to_localize: Список элементов для локализации
        config: Словарь с конфигурацией
            repo_name: Имя репозитория
            cars_dir: Директория для сохранения файлов
            thumbs_dir: Директория для сохранения превьюшек
            skip_thumbs: Пропускать создание превьюшек
            image_tag: Имя тега с изображениями
            description_tag: Имя тега с описанием
    """
    price = int(car.find('price').text or 0)
    credit_discount = int(car.find('creditDiscount').text or 0)
    tradein_discount = int(car.find('tradeinDiscount').text or 0)
    max_discount = credit_discount + tradein_discount
    create_child_element(car, 'max_discount', max_discount)
    if(car.find('priceWithDiscount').text is None):
        update_element_text(car, 'priceWithDiscount', price - max_discount)
    create_child_element(car, 'sale_price', car.find('priceWithDiscount').text or price - max_discount)
    
    friendly_url = process_friendly_url(
        join_car_data(car, 'mark_id', 'folder_id', 'modification_id', 'complectation_name', 'color', 'year')
    )
    print(f"Уникальный идентификатор: {friendly_url}")
    
    create_child_element(car, 'url', f"https://{config['repo_name']}/cars/{friendly_url}/")
    
    file_name = f"{friendly_url}.mdx"
    file_path = os.path.join(config['cars_dir'], file_name)

    update_car_prices(car, prices_data)

    if os.path.exists(file_path):
        update_yaml(car, file_path, friendly_url, current_thumbs, config)
    else:
        create_file(car, file_path, friendly_url, current_thumbs, existing_files, elements_to_localize, config)


def main():
    """
    Основная функция программы.
    """
    parser = argparse.ArgumentParser(description='Download and merge XML files.')
    parser.add_argument('--thumbs_dir', default='public/img/thumbs/', help='Default output directory for thumbnails')
    parser.add_argument('--cars_dir', default='src/content/cars', help='Default cars directory')
    parser.add_argument('--input_file', default='cars.xml', help='Input to file')
    parser.add_argument('--output_path', default='./public/cars.xml', help='Output path/file')
    parser.add_argument('--repo_name', default=os.getenv('REPO_NAME', 'localhost'), help='Repository name')
    parser.add_argument('--xml_url', default=os.getenv('XML_URL'), help='XML URL')
    parser.add_argument('--skip_thumbs', action="store_true", help='Skip create thumbnails')
    parser.add_argument('--image_tag', default='image', help='Image tag name')
    parser.add_argument('--description_tag', default='description', help='Description tag name')
    args = parser.parse_args()
    config = vars(args)

    prices_data = load_price_data()

    # Инициализация
    root = get_xml_content(args.input_file, args.xml_url)
    tree = ET.ElementTree(root)
    setup_directories(config['thumbs_dir'], args.cars_dir)
    
    existing_files = set()

    with open('output.txt', 'w') as file:
        file.write("")

    # Предполагаем, что у вас есть элементы с именами
    elements_to_localize = [
        'engineType', 'driveType', 'gearboxType', 'ptsType', 'color', 'body_type', 'wheel'
    ]
    # , 'bodyColor', 'bodyType', 'steeringWheel'

    # Списки для удаления
    remove_mark_ids = [
    ]
    remove_folder_ids = [
    ]
    cars_to_remove = [
    ]

    # Список для хранения путей к текущим превьюшкам
    current_thumbs = []
    
    # Обработка машин
    cars_element = root
    for car in cars_element:
        rename_child_element(car, 'brand', 'mark_id')
        rename_child_element(car, 'model', 'folder_id')

        if should_remove_car(car, remove_mark_ids, remove_folder_ids):
            cars_to_remove.append(car)
            continue
        
        rename_child_element(car, 'modification', 'modification_id')
        rename_child_element(car, 'complectation', 'complectation_name')
        rename_child_element(car, 'bodyColor', 'color')
        rename_child_element(car, 'mileage', 'run')
        rename_child_element(car, 'bodyType', 'body_type')
        rename_child_element(car, 'steeringWheel', 'wheel')

        process_car(car, existing_files, current_thumbs, prices_data, elements_to_localize, config)
    
    # Удаление ненужных машин
    for car in cars_to_remove:
        cars_element.remove(car)
    
    convert_to_string(root)
    tree.write(args.output_path, encoding='utf-8', xml_declaration=True)
    
    # Очистка
    cleanup_unused_thumbs(current_thumbs, config['thumbs_dir'])
    
    for existing_file in os.listdir(args.cars_dir):
        filepath = os.path.join(args.cars_dir, existing_file)
        if filepath not in existing_files:
            os.remove(filepath)
    
    if os.path.exists('output.txt') and os.path.getsize('output.txt') > 0:
        print("error 404 found")

if __name__ == "__main__":
    main()
