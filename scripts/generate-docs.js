const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const readme = fs.readFileSync(path.resolve(__dirname, './README.md'), 'utf8');

exec('./bin/n-heroku-tools.js', (error, stdout, stderr) => {
	if (error) {
		throw error.message;
	}

	if (stderr) {
		throw stderr;
	}

	fs.writeFileSync('./README.md', readme.replace('{{ CLI_HELP }}', stdout));
});
