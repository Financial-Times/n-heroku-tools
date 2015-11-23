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

function task (opts) {
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
						ContentType: opts.contentType || determineContentType(file),
						ACL: 'public-read',
						Body: content,
						CacheControl: opts.cacheControl || (opts.cache ? 'public, max-age=31536000' : undefined)
					}, function(err, data) {
						if (err) {
							reject(err);
						} else {
							resolve(data);
						}
					});
				})
					.then(function() {
						console.log("Successfully uploaded: " + key);
					});
			});
	}));
};

module.exports = function (program, utils) {
	program
		.command('deploy-static <source> [otherSources...]')
		.description('Deploys static <source> to [destination] on S3 (where [destination] is a full S3 URL).  Requires AWS_ACCESS and AWS_SECRET env vars')
		.option('--strip <strip>', 'Optionally strip off the <strip> leading components off of the source file name')
		.option('--destination <destination>', 'Optionally add a prefix to the upload path')
		.option('--region <region>', 'Optionally set the region (default to eu-west-1)')
		.option('--bucket <bucket>', 'Optionally set the bucket (default to ft-next-qa)')
		.option('--no-cache', 'Optionally don\'t set a far future cache')
		.option('--cache-control <cacheControl>', 'Optionally specify a cache control value')
		.option('--content-type <contentType>', 'Optionally specify a content type value')
		.action(function(file, files, opts) {
			files.unshift(file);
			var region = opts.region || 'eu-west-1';
			var bucket = opts.bucket || 'ft-next-qa';
			var destination = opts.destination || "";

			return task({
				files: files,
				destination: destination,
				region: region,
				bucket: bucket,
				strip: opts.strip,
				cache: opts.cache,
				cacheControl: opts.cacheControl,
				contentType: opts.contentType
			}).catch(utils.exit);
		});
};

module.exports.task = task;
