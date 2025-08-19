#!/bin/bash

# Скрипт для тестирования одного фида из папки example
# Запускать из корня проекта: sh .github/scripts/sh/test/test_single_feed.sh

echo "🚗 Тестирование одного фида"
echo "============================"

# Список доступных фидов
declare -A feeds=(
    ["1"]="Ads-Ad.xml - Avito формат"
    ["2"]="Ads-Ad--carcopy.xml - Avito формат (CarCopy)"
    ["3"]="Ads-Ad--1c.xml - Avito формат (1C)"
    ["4"]="data-cars-car--cm.expert.xml - CM Expert формат"
    ["5"]="data-cars-car--1c.xml - CM Expert формат (1C)"
    ["6"]="data-cars-car--carcopy.xml - CM Expert формат (CarCopy)"
    ["7"]="vehicles-vehicle--maxposter.xml - MaxPoster формат"
    ["8"]="avtoxml-Offers-Offer--maxposter.xml - MaxPoster формат (AvtoXML)"
    ["9"]="yml_catalog-shop-offers-offer--cm.expert.xml - YML формат (CM Expert)"
)

# Показываем список доступных фидов
echo "Доступные фиды:"
for key in "${!feeds[@]}"; do
    echo "  $key) ${feeds[$key]}"
done

echo ""
read -p "Выберите номер фида (1-9): " choice

# Проверяем корректность выбора
if [[ ! "$choice" =~ ^[1-9]$ ]]; then
    echo "❌ Неверный выбор. Введите число от 1 до 9."
    exit 1
fi

# Определяем имя файла по выбору
case $choice in
    1) input_file="Ads-Ad.xml" ;;
    2) input_file="Ads-Ad--carcopy.xml" ;;
    3) input_file="Ads-Ad--1c.xml" ;;
    4) input_file="data-cars-car--cm.expert.xml" ;;
    5) input_file="data-cars-car--1c.xml" ;;
    6) input_file="data-cars-car--carcopy.xml" ;;
    7) input_file="vehicles-vehicle--maxposter.xml" ;;
    8) input_file="avtoxml-Offers-Offer--maxposter.xml" ;;
    9) input_file="yml_catalog-shop-offers-offer--cm.expert.xml" ;;
esac

echo ""
echo "📋 Выбран: ${feeds[$choice]}"
echo "📁 Файл: $input_file"
echo ""

# Очищаем предыдущие результаты
rm -rf src/content/cars/*
rm -rf public/img/thumbs/*

echo "🧹 Очищены предыдущие результаты"

# Запускаем обработчик
echo "🔄 Обрабатываем фид..."
python .github/scripts/update_cars.py \
    --input_file ".github/scripts/example/$input_file" \
    --output_path ".github/scripts/test_results/$input_file" \
    --domain "localhost:4321" \
    --cars_dir "src/content/cars" \
    --thumbs_dir "public/img/thumbs" \
    --count_thumbs 1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Успешно обработан!"
    echo "📊 Статистика:"
    echo "   📁 Создано MDX файлов: $(ls -1 src/content/cars/*.mdx 2>/dev/null | wc -l)"
    echo "   🖼️  Создано превью: $(ls -1 public/img/thumbs/*.webp 2>/dev/null | wc -l)"
    echo ""
    echo "🌐 Для просмотра результатов запустите:"
    echo "   pnpm dev"
    echo "   Затем откройте: http://localhost:4321/cars/"
else
    echo "❌ Ошибка при обработке фида"
fi 