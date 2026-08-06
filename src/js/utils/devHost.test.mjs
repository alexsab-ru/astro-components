import assert from 'node:assert/strict';
import {resolveDevHost} from './devHost.js';

assert.equal(
	resolveDevHost('haval-ulyanovsk.ru'),
	'haval-ulyanovsk.ru.localhost',
	'обычный домен получает суффикс .localhost'
);

assert.equal(
	resolveDevHost('promo.kia-samara.ru'),
	'promo.kia-samara.ru.localhost',
	'многоуровневый домен сохраняет точки'
);

assert.equal(
	resolveDevHost('localhost'),
	'localhost',
	'DOMAIN=localhost не превращается в localhost.localhost'
);

assert.equal(
	resolveDevHost('127.0.0.1'),
	'localhost',
	'петлевой IP отдаёт обычный localhost'
);

assert.equal(
	resolveDevHost(''),
	'localhost',
	'пустое значение отдаёт обычный localhost'
);

assert.equal(
	resolveDevHost(undefined),
	'localhost',
	'отсутствующее значение отдаёт обычный localhost'
);

assert.equal(
	resolveDevHost(null),
	'localhost',
	'null отдаёт обычный localhost'
);

assert.equal(
	resolveDevHost(42),
	'localhost',
	'не-строка отдаёт обычный localhost'
);

assert.equal(
	resolveDevHost('https://haval-ulyanovsk.ru'),
	'haval-ulyanovsk.ru.localhost',
	'протокол https отбрасывается'
);

assert.equal(
	resolveDevHost('http://haval-ulyanovsk.ru/'),
	'haval-ulyanovsk.ru.localhost',
	'протокол http и завершающий слэш отбрасываются'
);

assert.equal(
	resolveDevHost('haval-ulyanovsk.ru/models/f7/'),
	'haval-ulyanovsk.ru.localhost',
	'путь отбрасывается'
);

assert.equal(
	resolveDevHost('localhost:4343'),
	'localhost',
	'порт отбрасывается до проверки на localhost'
);

assert.equal(
	resolveDevHost('  haval.alexsab.ru  '),
	'haval.alexsab.ru.localhost',
	'пробелы по краям обрезаются'
);

assert.equal(
	resolveDevHost('HAVAL-Ulyanovsk.RU'),
	'haval-ulyanovsk.ru.localhost',
	'регистр приводится к нижнему — имена хостов регистронезависимы'
);

assert.equal(
	resolveDevHost('haval-ulyanovsk.ru.localhost'),
	'haval-ulyanovsk.ru.localhost',
	'уже готовый .localhost не удваивается'
);

console.log('devHost tests passed');
