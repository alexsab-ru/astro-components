import assert from 'node:assert/strict';
import { shuffleChildOrder, shuffleRandomDealers } from './randomDealer.js';

// Tiny DOM-like parent: children is a live array, appendChild moves a node to the end.
function makeRoot(ids) {
	const nodes = ids.map((id) => ({ id }));
	return {
		children: nodes,
		appendChild(node) {
			const index = this.children.indexOf(node);
			if (index !== -1) this.children.splice(index, 1);
			this.children.push(node);
		},
	};
}

const single = makeRoot(['a']);
shuffleChildOrder(single);
assert.deepEqual(
	single.children.map((node) => node.id),
	['a'],
	'one child stays in place'
);

// random() === 0 makes Fisher-Yates swap each i with index 0
const two = makeRoot(['a', 'b']);
shuffleChildOrder(two, () => 0);
assert.deepEqual(
	two.children.map((node) => node.id),
	['b', 'a'],
	'two children swap when rng always returns 0'
);

const skipped = makeRoot(['keep']);
const dealer = makeRoot(['a', 'b']);
shuffleRandomDealers(
	{
		querySelectorAll(selector) {
			assert.equal(selector, '.random-dealer');
			return [dealer];
		},
	},
	() => 0
);
assert.deepEqual(
	dealer.children.map((node) => node.id),
	['b', 'a'],
	'.random-dealer children are shuffled'
);
assert.deepEqual(
	skipped.children.map((node) => node.id),
	['keep'],
	'nodes outside .random-dealer are left alone'
);

console.log('randomDealer tests passed');
