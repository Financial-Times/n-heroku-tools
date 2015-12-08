'use strict';

const app = require('express')();
const bodyParser = require('body-parser');
const task = require('../tasks/test-urls').task;
const expect = require('chai').expect;

app.get('/get-200', (req, res) => {
	res.sendStatus(200);
});

app.get('/get-404', (req, res) => {
	res.sendStatus(404);
});

app.get('/get-302', (req, res) => {
	res.redirect('http://www.thing.com')
});

app.get('/get-header', (req, res) => {
	expect(req.get('test-header')).to.equal('header-value');
	res.sendStatus(200);
});

app.post('/post-200', (req, res) => {
	res.sendStatus(200);
});

app.post('/post-json', bodyParser.json({ extended: true }), (req, res) => {
	expect(req.body).to.deep.equal({foo: 'bar'});
	res.sendStatus(200);
});

app.post('/post-form', bodyParser.urlencoded({ extended: true }), (req, res) => {
	expect(req.body).to.deep.equal({foo: 'bar'});
	res.sendStatus(200);
});



app.post('/post-404', (req, res) => {
	res.sendStatus(404);
});

app.post('/post-302', (req, res) => {
	res.redirect('http://www.thing.com')
});


app.post('/post-json-302', bodyParser.json({ extended: true }), (req, res) => {
	expect(req.body).to.deep.equal({foo: 'bar'});
	res.redirect('http://www.thing.com')
});

app.post('/post-form-302', bodyParser.urlencoded({ extended: true }), (req, res) => {
	expect(req.body).to.deep.equal({foo: 'bar'});
	res.redirect('http://www.thing.com')
});

describe('test-urls', function () {

	before(() => {
		return new Promise(resolve => {
			app.listen(process.env.PORT, function () {
				console.log('test app listening on ' + process.env.PORT);
				resolve();
			});
		});
	})

	it('should execute a wide variety of test-url configs', function () {
		return task({
			configPath: 'test/fixtures/smoke',
			app: 'localhost:' + process.env.PORT
		});
	})

});





