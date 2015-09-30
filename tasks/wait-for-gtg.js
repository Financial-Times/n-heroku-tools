module.exports = function(opts) {
	var name = opts.app;

	return new Promise(function(resolve, reject) {
		var timeout;
		var checker;
		function checkGtg() {
			console.log('polling: http://' + name + '.herokuapp.com/__gtg');
			fetch('http://' + name + '.herokuapp.com/__gtg', {
					timeout: 2000,
					follow: 0
				})
				.then(function(response) {
					if (response.ok) {
						console.log('poll __gtg ok');
						clearTimeout(timeout);
						clearInterval(checker);
						resolve();
					} else {
						console.log('poll __gtg not ok');
					}
				});
		}
		checker = setInterval(checkGtg, 3000);
		timeout = setTimeout(function() {
			console.log('2 minutes passed, bailing');
			reject(name + '.herokuapp.com/__gtg not responding with an ok response within 2 minutes');
			clearInterval(checker);
		}, 2*60*1000);
	});

};
