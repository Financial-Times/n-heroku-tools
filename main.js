'use strict';

module.exports = {
	configure: require('./tasks/configure'),
	deployHashedAssets: require('./tasks/deploy-hashed-assets'),
	deployStatic: require('./tasks/deploy-static'),
	deployVcl: require('./tasks/deploy-vcl'),
	deploy: require('./tasks/deploy'),
	destroy: require('./tasks/destroy'),
	nightwatch: require('./tasks/nightwatch'),
	provision: require('./tasks/provision'),
	purge: require('./tasks/purge'),
	scale: require('./tasks/scale')
};
