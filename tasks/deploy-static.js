"use strict";

var aws = require('aws-sdk');
var url = require('url');
var denodeify = require('denodeify');
var readFile = denodeify(require('fs').readFile);
var determineContentType = require('../lib/determine-content-type');
var path = require('path');

var AWS_ACCESS = process.env.AWS_ACCESS;
var AWS_SECRET = process.env.AWS_SECRET;

module.exports = function(opts) {
	if (!(AWS_ACCESS && AWS_SECRET)) {
		Promise.reject("Must set AWS_ACCESS and AWS_SECRET");
	}

	var file = path.relative(process.cwd(), opts.file);
	var destination = opts.destination || file;
	var bucket = opts.bucket;

	aws.config.update({
		accessKeyId: process.env.AWS_ACCESS,
		secretAccessKey: process.env.AWS_SECRET,
		region: opts.region
	});

	var s3bucket = new aws.S3({ params: { Bucket: bucket } });

	return readFile(file).then(function(content) {
		console.log("About to upload " + file + " to " + destination);
		return new Promise(function(resolve, reject) {
			s3bucket.upload({
					Key: destination,
					ContentType: determineContentType(file),
					ACL: 'public-read',
					Body: content,

					// Copying next-build-tools for now
					CacheControl: 'public, max-age=604800000'
				}, function(err, data) {
					if (err) {
						reject(err);
					} else {
						resolve(data);
					}
				});
		})
			.then(function(result) {
				console.log("Successfully uploaded: " + file);
			});

	});
};
