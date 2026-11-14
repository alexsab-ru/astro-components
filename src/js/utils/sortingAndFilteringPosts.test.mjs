import test from 'node:test';
import assert from 'node:assert/strict';
import { sortingAndFilteringPosts } from './sortingAndFilteringPosts.js';

test('списки скрывают услуги без карточки, сохраняя исходные записи для прямых страниц', () => {
	const entries = [
		{ id: 'detailing', data: {} },
		{ id: 'wash', data: { listed: false } },
		{ id: 'listed-service', data: { listed: true } },
		{ id: 'draft', data: { draft: true } },
		{ id: 'expired', data: { toDate: new Date('2000-01-01') } },
		{ id: '__disabled', data: {} },
	];

	assert.deepEqual(sortingAndFilteringPosts([...entries]).map(({ id }) => id), [
		'detailing',
		'listed-service',
	]);
	assert.equal(entries.find(({ id }) => id === 'wash').data.draft, undefined);
	assert.equal(entries.length, 6);
});
