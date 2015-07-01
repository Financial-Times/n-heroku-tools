"use strict";

var aws = require('aws-sdk');
var denodeify = require('denodeify');
var fs = require('fs');
var readFile = denodeify(fs.readFile);
var lstatSync = fs.lstatSync;
var determineContentType = require('../lib/determine-content-type');
var path = require('path');

var AWS_ACCESS = process.env.AWS_ACCESS;
var AWS_SECRET = process.env.AWS_SECRET;

module.exports = function(opts) {
	if (!(AWS_ACCESS && AWS_SECRET)) {
		Promise.reject("Must set AWS_ACCESS and AWS_SECRET");
	}

	var files = opts.files
		.filter(function(file) {
			return !lstatSync(file).isDirectory();
		});

	var destination = opts.destination || "";
	var bucket = opts.bucket;

	aws.config.update({
		accessKeyId: process.env.AWS_ACCESS,
		secretAccessKey: process.env.AWS_SECRET,
		region: opts.region
	});

	var s3bucket = new aws.S3({ params: { Bucket: bucket } });

	return Promise.all(files.map(function(file) {
		return readFile(file)
			.then(function(content) {
				file = path.relative(process.cwd(), file);
				var key = file;

				if (opts.strip) {
					key = file.split('/').splice(opts.strip).join('/');
				}

				key = path.join(destination, key);

				console.log("About to upload " + file + " to " + key);
				return new Promise(function(resolve, reject) {
					s3bucket.upload({
							Key: key,
							ContentType: determineContentType(file),
							ACL: 'public-read',
							Body: content,
							CacheControl: opts.cache ? undefined : 'public, max-age=604800000'
						}, function(err, data) {
							if (err) {
								reject(err);
							} else {
								resolve(data);
							}
						});
				})
					.then(function(result) {
						console.log("Successfully uploaded: " + key);
					});
			});
	}));
};
