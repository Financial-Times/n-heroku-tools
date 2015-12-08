module.exports = [
	{
		urls: {
			'/get-200': 200,
			'/get-404': 404,
			'/get-302': 302,
			'/get-302': 'http://www.thing.com'
		}
	}, {
		headers: {
			'test-header': 'header-value'
		},
		urls: {
			'/get-header': 200
		}
	}, {
		method: 'POST',
		urls: {
			'/post-200': 200,
			'/post-404': 404,
			'/post-302': 302,
			'/post-302': 'http://www.thing.com'
		}
	}, {
		method: 'POST',
		body: {foo: 'bar'},
		headers: {
			'Content-Type': 'application/json'
		},
		urls: {
			'/post-json': 200,
			'/post-json-302': 302,
			'/post-json-302': 'http://www.thing.com'
		}
	}, {
		method: 'POST',
		body: 'foo=bar',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		urls: {
			'/post-form': 200,
			'/post-form-302': 302,
			'/post-form-302': 'http://www.thing.com'
		}
	}
];
