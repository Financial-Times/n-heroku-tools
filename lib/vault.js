/* eslint no-console: 0 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const vault = require('node-vault')({ endpoint: 'https://vault.in.ft.com' });

const vaultTokenPath = path.join(os.homedir(), '.vault-token');

if (fs.existsSync(vaultTokenPath)) {
	vault.token = fs.readFileSync(vaultTokenPath);
}

const get = () => {
	if (vault.token) {
		return vault;
	}

	return vault.write('auth/approle/login', {
		'role_id': process.env.VAULT_ROLE_ID,
		'secret_id': process.env.VAULT_SECRET_ID
	})
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
