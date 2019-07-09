'use strict';

const packageJson = require(process.cwd() + '/package.json');
const denodeify = require('denodeify');
const normalizeName = require('../lib/normalize-name');
const readFile = denodeify(require('fs').readFile);
const waitForOk = require('../lib/wait-for-ok');
const path = require('path');
const aws = require('aws-sdk');

const AWS_ACCESS_HASHED_ASSETS = process.env.AWS_ACCESS_HASHED_ASSETS || process.env.aws_access_hashed_assets;
const AWS_SECRET_HASHED_ASSETS = process.env.AWS_SECRET_HASHED_ASSETS || process.env.aws_secret_hashed_assets;

const defaultDestinationDirectory = normalizeName(packageJson.name, { version: false });
const defaultDirectory = 'public';
const defaultManifestFile = 'asset-hashes.json';
const euBucket = 'ft-next-hashed-assets-prod';
const usBucket = 'ft-next-hashed-assets-prod-us';
const euRegion = 'eu-west-1';
const usRegion = 'us-east-1';
const gzip = denodeify(require('zlib').gzip);

function task (opts) {

	aws.config.update({
		accessKeyId: AWS_ACCESS_HASHED_ASSETS,
		secretAccessKey: AWS_SECRET_HASHED_ASSETS,
		euRegion
	});

	function upload (bucket, params) {

		const s3Bucket = new aws.S3({ params: { Bucket: bucket } });
		return new Promise((resolve, reject) => {
			return s3Bucket.upload(params, (err, data) => {
						if (err) {
							console.error(`Upload failed to ${bucket}`, err); // eslint-disable-line no-console
							reject(err);
						} else {
							console.log(`Upload success to ${bucket}`, data); // eslint-disable-line no-console
							resolve();
						}
					});
				});
	}

	const shouldMonitorAssets = opts.monitorAssets;

	let assetHashes;

	try {
		assetHashes = require(process.cwd() + `/${opts.directory}/${opts.manifestFile}`);
	} catch(err) {
		return Promise.reject('Failed to load hashed assets manifest file.');
	}

	if (!(AWS_ACCESS_HASHED_ASSETS && AWS_SECRET_HASHED_ASSETS)) {
		return Promise.reject('Must set AWS_ACCESS_HASHED_ASSETS and AWS_SECRET_HASHED_ASSETS');
	}



	console.log('Deploying hashed assets to S3...'); // eslint-disable-line no-console

	return Promise.all(
		Object.keys(assetHashes)
			.filter(file => typeof assetHashes[file] === 'string')
			.map(file => {
				const hashedFileName = assetHashes[file];
				const fileNameOnDisk = opts.assetsAreHashed ? hashedFileName : file;

				const key = 'hashed-assets/' + opts.destinationDirectory + '/' + hashedFileName;
				// get the extension, ignoring brotli
				const extension = (/\.(js|css)(\.br)?$/.exec(fileNameOnDisk) || [])[1];

				console.log(`sending ${fileNameOnDisk} as ${key} to S3`); // eslint-disable-line no-console

				return readFile(path.join(process.cwd(), opts.directory, fileNameOnDisk), { encoding: 'utf-8' })
					.then(content => {
						// ignore source maps
						const isMonitoringAsset = shouldMonitorAssets && path.extname(fileNameOnDisk) !== '.map';
						let params = {
							Key: key,
							Body: content,
							ACL: 'public-read',
							CacheControl: opts.cacheControl || 'public, max-age=31536000'
						};

						if (opts.surrogateControl) {
							params.Metadata = {
								'Surrogate-Control': opts.surrogateControl
							};
						}

						switch(extension) {
							case 'js':
								params.ContentType = 'text/javascript; charset=utf-8';
								break;
							case 'css':
								params.ContentType = 'text/css; charset=utf-8';
								break;
						}
						return Promise.all([
							upload(euBucket, params),
							upload(usBucket, params)
						])
							.then(() => Promise.all([
								waitForOk(`http://${euBucket}.s3-website-${euRegion}.amazonaws.com/${key}`),
								waitForOk(`http://${usBucket}.s3-website-${usRegion}.amazonaws.com/${key}`),
								isMonitoringAsset ? gzip(content) : Promise.resolve()
							]))
							.then(values => {
								if (!isMonitoringAsset) {
									return;
								}
								const contentSize = Buffer.byteLength(content);
								const gzippedContentSize = Buffer.byteLength(values[2]);
								console.log(`${file} is ${contentSize} bytes (${gzippedContentSize} bytes gzipped)`); // eslint-disable-line no-console
							});
					});
			})
		);
}

module.exports = function (program, utils) {
	program
		.command('deploy-hashed-assets')
		.description('deploys hashed asset files to S3 (if AWS keys set correctly)')
		.option('--manifest-file <filename>', 'Name of the manifest file to read', defaultManifestFile)
		.option('--assets-are-hashed', 'Assume assets already have hashed filenames')
		.option('--directory <directory>', 'Directory containing the assets to deploy', defaultDirectory)
		.option('--destination-directory <directory>', 'Name of the directory in the S3 bucket to upload into', defaultDestinationDirectory)
		.option('--monitor-assets', 'Send asset sizes to Graphite')
		.option('--cache-control <cacheControl>', 'Optionally specify a cache control value')
		.option('--surrogate-control <cacheControl>', 'Optionally specify a surrogate control value')
		.action(function (options) {
			task(options).catch(utils.exit);
		});

};

module.exports.task = task;
