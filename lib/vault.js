/* eslint no-console: 0 */
const vault = require('node-vault')({ endpoint: 'https://vault.in.ft.com' });

const credentials = {
	'role_id': process.env.VAULT_ROLE_ID,
	'secret_id': process.env.VAULT_SECRET_ID
};

const get = () => {
	return vault.write('auth/approle/login', credentials)
		.then(data => {
			vault.token = data.auth.client_token;
			const lease = data.auth.lease_duration;
			console.log({ event: 'VAULT_AUTH', lease: `${lease}s` });
			return vault;
		})
		.catch(error => {
			console.log({ event: 'VAULT_AUTH_ERROR' }, error);
			throw error;
		});
};

module.exports.get = get;
