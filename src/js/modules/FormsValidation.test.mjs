import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sourceUrl = new URL('./FormsValidation.js', import.meta.url);
const source = readFileSync(sourceUrl, 'utf8').replace(
	'import { phoneChecker } from "@alexsab-ru/scripts";',
	`const phoneChecker = (phone) => phone.value === '+7 927 749-94-77';`
);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { default: FormsValidation } = await import(moduleUrl);

class FakeClassList {
	constructor(...classes) {
		this.classes = new Set(classes);
	}

	add(className) {
		this.classes.add(className);
	}

	remove(className) {
		this.classes.delete(className);
	}

	contains(className) {
		return this.classes.has(className);
	}
}

class FakePhoneInput extends EventTarget {
	constructor(errorField) {
		super();
		this.disabled = false;
		this.type = 'tel';
		this.required = true;
		this.offsetParent = {};
		this.value = '+7 927';
		this.minLength = -1;
		this.maxLength = -1;
		this.name = 'phone';
		this.parentElement = {
			querySelector: () => errorField,
		};
		this.customValidationMessage = '';
	}

	closest() {
		return null;
	}

	setCustomValidity(message) {
		this.customValidationMessage = message;
	}

	get validationMessage() {
		return this.customValidationMessage;
	}

	get validity() {
		return {
			valueMissing: false,
			patternMismatch: false,
			tooShort: false,
			tooLong: false,
			customError: this.customValidationMessage !== '',
		};
	}

	scrollIntoView() {}
}

const createFixture = () => {
	const errorField = {
		innerText: '',
		classList: new FakeClassList('hidden'),
		_inputHandler: null,
	};
	const phone = new FakePhoneInput(errorField);
	const form = {
		elements: [phone],
		querySelector: () => errorField,
		querySelectorAll: () => [],
	};

	return {
		errorField,
		phone,
		validation: new FormsValidation(form),
	};
};

test('corrected phone can be validated after an invalid submit attempt', () => {
	const { errorField, phone, validation } = createFixture();

	validation.validate();
	assert.equal(validation.isValid, false);
	assert.equal(phone.validity.customError, true);
	assert.equal(errorField.classList.contains('hidden'), false);

	phone.value = '+7 927 749-94-77';
	phone.dispatchEvent(new Event('input'));

	assert.equal(phone.validity.customError, false);
	assert.equal(errorField.classList.contains('hidden'), true);
	assert.equal(errorField._inputHandler, null);

	validation.validate();
	assert.equal(validation.isValid, true);
	assert.equal(phone.validity.customError, false);
});

test('editing clears the stale browser error but validation still rejects an invalid phone', () => {
	const { phone, validation } = createFixture();

	validation.validate();
	phone.value = '+7 928';
	phone.dispatchEvent(new Event('input'));
	assert.equal(phone.validity.customError, false);

	validation.validate();
	assert.equal(validation.isValid, false);
	assert.equal(phone.validity.customError, true);
});
