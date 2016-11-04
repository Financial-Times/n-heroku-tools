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
const gzip = denodeify(require('zlib').gzip);
const Metrics = require('next-metrics').Metrics;
const isImage = require('is-image');

function task (opts) {
	opts.region = opts.region || 'eu-west-1';
	opts.bucket = opts.bucket || 'ft-next-qa';
	opts.destination = opts.destination || "";
	opts.acl = opts.acl || 'public-read';
	const files = opts.files
		.filter(function (file) {
			return !lstatSync(file).isDirectory();
		});
	const destination = opts.destination || "";
	const bucket = opts.bucket;

	const metrics = new Metrics;
	metrics.init({
		platform: 's3',
		app: opts.bucket,
		instance: false,
		useDefaultAggregators: false,
		flushEvery: false,
		forceGraphiteLogging: true
	});


	if (files.length < 1) {
		return Promise.reject("No files found for upload to s3.  (Directories are ignored)");
	}
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
			const content = (isImage(file)) ? yield readFile(file) : yield readFile(file, { encoding: 'utf-8' });
			file = path.relative(process.cwd(), file);
			let key = file;
			const isMonitoringAsset = opts.monitor && path.extname(file) !== '.map';

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

			if (false) {//s3Version === localVersion) {
				console.log(`Unchanged, skipping: ${key}`);
			} else {
				console.log(`s3/local: ${s3Version} ${localVersion}`);
				console.log(`Will upload ${file} to ${key}`);

				const payload = {
					Key: key,
					ContentType: opts.contentType || mime.lookup(file),
					ACL: opts.acl,
					Body: content,
					CacheControl: opts.cacheControl || (opts.cache ? 'public, max-age=31536000' : undefined)
				};

				if (opts.surrogateControl) {
					payload.Metadata = {
						'Surrogate-Control': opts.surrogateControl
					}
				}

				if (payload.ContentType === 'text/javascript' || payload.ContentType === 'text/css') {
					payload.ContentType += '; charset=utf-8';
				}

				yield denodeify(s3bucket.upload.bind(s3bucket))(payload)
					.then(() => isMonitoringAsset ? gzip(content) : Promise.resolve())
					.then(gzipped => {
						if (!isMonitoringAsset) {
							return;
						}
						const contentSize = Buffer.byteLength(content);
						const gzippedContentSize = Buffer.byteLength(gzipped);
						console.log(`${key} is ${contentSize} bytes (${gzippedContentSize} bytes gzipped)`);
						const safeFile = key.replace(/\//g, '.');
						metrics.count(`${safeFile}.size`, contentSize);
						metrics.count(`${safeFile}.gzip_size`, gzippedContentSize);
					})
				console.log(`Successfully uploaded: ${key}`);
			}
		});
	}))
		.then(() => {
			metrics.flush();
		});
};

module.exports = function (program, utils) {
	program
		.command('deploy-static <source> [otherSources...]')
		.description('Deploys static <source> to S3.  Requires AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars')
		.option('--strip <strip>', 'Optionally strip off the <strip> leading components off of the source file name')
		.option('--destination <destination>', 'Optionally add a prefix to the upload path')
		.option('--region <region>', 'Optionally set the region (default to eu-west-1)')
		.option('--bucket <bucket>', 'Optionally set the bucket (default to ft-next-qa)')
		.option('--no-cache', 'Optionally don\'t set a far future cache')
		.option('--cache-control <cacheControl>', 'Optionally specify a cache control value')
		.option('--surrogate-control <cacheControl>', 'Optionally specify a surrogate control value')
		.option('--content-type <contentType>', 'Optionally specify a content type value')
		.option('--acl <acl>', 'Optionally set the Canned Access Control List for new files being put into s3 (default to public-read)')
		.option('--monitor', 'Optionally monitor the size of the asset')
		.action(function (file, files, opts) {
			files.unshift(file);

			return task({
				files: files,
				destination: opts.destination,
				region: opts.region,
				bucket: opts.bucket,
				acl: opts.acl,
				strip: opts.strip,
				cache: opts.cache,
				monitor: opts.monitor,
				cacheControl: opts.cacheControl,
				surrogateControl: opts.surrogateControl,
				contentType: opts.contentType,
			}).catch(utils.exit);
		});
};

module.exports.task = task;
