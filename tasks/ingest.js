var keys = require('../lib/keys');

module.exports = function(options) {
	var uuids = options.uuids;

	return keys()
		.then(function(env) {
			return Promise.all(uuids.map(function(uuid) {
					return fetch("https://ft-next-harrier-eu.herokuapp.com/api/item?apiKey=" + env.HARRIER_API_KEY, {
							method: "PUT",
							timeout: 15 * 1000,
							body: JSON.stringify({
								id: uuid,
								index: 'v1_api_v2',
								type: 'item'
							}),
							headers: {
								'Content-Type': 'application/json'
							}
						})
						.then(function(res) {
							if (res.ok) {
								console.log('Successfully ingested ' + uuid);
							} else {
								console.log('Failed to ingest: ' + uuid);
							}
						})
						.catch(function() {
							console.log('\nFailed to ingest: ' + uuid);
						});
				}));
		});
};
