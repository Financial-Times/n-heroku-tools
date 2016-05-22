'use strict';

const aws = require('aws-sdk');
const denodeify = require('denodeify');
const fs = require('fs');
const readFile = denodeify(fs.readFile);
const lstatSync = fs.lstatSync;
const mime = require('mime');
const path = require('path');
const co = require('co');
const md5File = denodeify(require('md5-file'));

function task (opts) {
	const files = opts.files
		.filter(function (file) {
			return !lstatSync(file).isDirectory();
		});
	const destination = opts.destination || "";
	const bucket = opts.bucket;

	// Backwards compatibility, prefer to use the standard AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY used by AWS NodeJS SDK
	if (process.env.AWS_ACCESS && process.env.AWS_SECRET) {
		aws.config.update({
			accessKeyId: process.env.AWS_ACCESS,
			secretAccessKey: process.env.AWS_SECRET
		});
	}

	const s3bucket = new aws.S3({ params: { Bucket: bucket, region: opts.region } });

	return Promise.all(files.map(function (file) {
		return co(function*() {
			const content = yield readFile(file);
			file = path.relative(process.cwd(), file);
			let key = file;

			if (opts.strip) {
				key = file.split('/').splice(opts.strip).join('/');
			}

			key = path.join(destination, key);

			const s3Version = yield denodeify(s3bucket.headObject.bind(s3bucket))({ Key: key })
				.catch(err => {
					if (err.code === 'NotFound') {
						return { ETag: '"NotFound"' };
					}
					return Promise.reject(err);
				})
				.then(head => head.ETag.replace(/"/g, ''));
			const localVersion = yield md5File(file);

			if (s3Version === localVersion) {
				console.log(`Unchanged, skipping: ${key}`);
			} else {
				console.log(`s3/local: ${s3Version} ${localVersion}`);
				console.log(`Will upload ${file} to ${key}`);
				yield denodeify(s3bucket.upload.bind(s3bucket))({
						Key: key,
						ContentType: opts.contentType || mime.lookup(file),
						ACL: 'public-read',
						Body: content,
						CacheControl: opts.cacheControl || (opts.cache ? 'public, max-age=31536000' : undefined)
					});
				console.log(`Successfully uploaded: ${key}`);
			}
		});
	}));
};

module.exports = function (program, utils) {
	program
		.command('deploy-static <source> [otherSources...]')
		.description('Deploys static <source> to [destination] on S3 (where [destination] is a full S3 URL).  Requires AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars')
		.option('--strip <strip>', 'Optionally strip off the <strip> leading components off of the source file name')
		.option('--destination <destination>', 'Optionally add a prefix to the upload path')
		.option('--region <region>', 'Optionally set the region (default to eu-west-1)')
		.option('--bucket <bucket>', 'Optionally set the bucket (default to ft-next-qa)')
		.option('--no-cache', 'Optionally don\'t set a far future cache')
		.option('--cache-control <cacheControl>', 'Optionally specify a cache control value')
		.option('--content-type <contentType>', 'Optionally specify a content type value')
		.action(function (file, files, opts) {
			files.unshift(file);
			const region = opts.region || 'eu-west-1';
			const bucket = opts.bucket || 'ft-next-qa';
			const destination = opts.destination || "";

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
