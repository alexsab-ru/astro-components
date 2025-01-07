#!/bin/bash
# utils.sh

# Функция для удаления кавычек из строки
trim_quotes() {
    local string="$1"
    # Удаляем двойные кавычки с начала и конца строки
    string="${string#\"}"
    string="${string%\"}"
    # Удаляем одинарные кавычки с начала и конца строки
    string="${string#\'}"
    string="${string%\'}"
    echo "$string"
}
