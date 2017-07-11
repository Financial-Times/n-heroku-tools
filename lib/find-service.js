'use strict';

module.exports = exports = (services, name) => {
	let serviceData = services.find(service => service.name === name);

	if (!serviceData) {
		serviceData = services.find(service => service.systemCode === name);
	}

	return serviceData || null;
};
