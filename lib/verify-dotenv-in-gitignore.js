'use strict';

var path = require('path');
var denodeify = require('denodeify');
var readFile = denodeify(require('fs').readFile);

module.exports = function() {
	return readFile(path.join(process.cwd(), '.gitignore'), { encoding: 'utf-8' })
		.then(function(gitignore) {
			gitignore = gitignore.split("\n");
			if (gitignore.indexOf('.env') === -1) {
				throw new Error("\n********************************************************"
					+ "\nPlease add `.env` into this project's `.gitignore` file."
					+ "\n********************************************************"
					+ "\nQ: Why?"
					+ "\nA: Because `next-build-tools` will soon start creating it instead of `.next-development-keys.json` in your home directory."
					+ "\n\nQ: … why?"
					+ "\nA: So that we can have per app API keys, it's a nice standard, and it means `next-build-tools` doesn't need to muck about in people's home directories anymore."
					+ "\n\nQ: O.K. but why do I need to change my `.gitignore` file?"
					+ "\nA: Without `.env` in `.gitignore` file we risk publishing API keys to git."
					+ "\n\nQ: Right, but because {{SENSIBLE_REASON}} I don't want to do this."
					+ "\nA: Fair enough, add `--skip-dotenv-check` to `nbt verify` in this project's `Makefile`"
					+ "\n\nQ: Shouldn't this have been a major version bump of `next-build-tools`?"
					+ "\nA: 🐴"
					+ "\n");
			}
		});
};
