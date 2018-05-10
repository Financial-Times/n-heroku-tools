'use strict';

module.exports = {
	configure: require('./tasks/configure'),
	deployHashedAssets: require('./tasks/deploy-hashed-assets'),
	deployStatic: require('./tasks/deploy-static'),
	deploy: require('./tasks/deploy'),
	destroy: require('./tasks/destroy'),
	provision: require('./tasks/provision'),
	scale: require('./tasks/scale')
};
