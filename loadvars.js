'use strict';
require('isomorphic-fetch');

if(process.env.NODE_ENV === 'localdev'){
	require('dotenv').load();
}
