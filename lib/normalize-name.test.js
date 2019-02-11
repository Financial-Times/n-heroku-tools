const normalizeName = require('./normalize-name');

describe.each([
	// name, options, expected
	['hello', {}, 'hello'],
	['next-hello', {}, 'hello'],
	['ft-next-hello', {}, 'hello'],
	['@financial-times/hello', {}, '@financial-times/hello'],

	['@financial-times/hello', { version: false }, 'hello'],
	['hello', { version: false }, 'hello'],
	['next-hello', { version: false }, 'hello'],
	['ft-next-hello', { version: false }, 'hello'],
	['ft-next-hello-v123', { version: false }, 'hello'],

	['ft-next-hello-another', { version: false }, 'hello-another']
])('normalize name', (name, options, expected) => {
	test(`returns ${expected}`, () => {
		expect(normalizeName(name, options)).toEqual(expected);
	});
});
