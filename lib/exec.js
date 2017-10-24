'use strict';

let denodeify = require('denodeify');
module.exports = denodeify(require('child_process').exec, function (err, stdout) { return [err, stdout]; });
