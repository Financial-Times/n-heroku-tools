const fs = require('fs');
const path = require('path');
const glob = require('glob');
const aws = require('aws-sdk');

const defaultDirectory = 'public';
const defaultBucket = 'ft-next-hashed-assets-prod';
const defaultDestination = 'hashed-assets/uploaded';
const defaultFileExtensions = ['js', 'css', 'map', 'gz', 'br'].join();
const defaultCacheControl = 'public, max-age=31536000';

function getFileType (filename) {
	// We want to know the original file type so ignore the compression
	const ext = path.extname(filename.replace(/\.(br|gz)$/, ''));

	switch (ext) {
		case '.js':
			return 'application/javascript';
		case '.css':
			return 'text/css';
		default:
			return 'application/octet-stream';
	}
}

function getFileEncoding (filename) {
	const ext = path.extname(filename);

	switch (ext) {
		case '.gz':
			return 'gzip';
		case '.br':
			return 'br';
		default:
			return 'identity';
	}
}

async function uploadFile (file, opts) {
	const s3 = new aws.S3({ params: { Bucket: opts.bucket } });

	const basename = path.basename(file);
	const type = getFileType(basename);
	const encoding = getFileEncoding(basename);
	const key = `${opts.destination}/${basename}`;

	const params = {
		Key: key,
		Body: fs.createReadStream(file),
		ACL: 'public-read',
		ContentType: `${type}; charset=utf-8`,
		ContentEncoding: encoding,
		CacheControl: opts.cacheControl
	};

	return new Promise((resolve, reject) => {
		return s3.upload(params, (error, data) => {
			if (error) {
				console.error(`Upload of ${basename} to ${opts.bucket} failed`); // eslint-disable-line no-console
				reject(error);
			} else {
				console.log(`Uploaded ${basename} to ${data.Location}`); // eslint-disable-line no-console
				resolve();
			}
		});
	});
}

async function uploadAssetsToS3 (opts) {
	const files = glob.sync(`${opts.directory}/*{${opts.extensions}}`);
	return await Promise.all(files.map((file) => uploadFile(file, opts)));
}

module.exports = function (program, utils) {
	program
		.command('upload-assets-to-s3')
		.description('Uploads a folder of assets to an S3 bucket')
		.option('--directory <directory>', 'Directory containing the assets to upload', defaultDirectory)
		.option('--bucket <bucket>', 'Name of the S3 bucket to upload into', defaultBucket)
		.option('--destination <directory>', 'Name of the destination directory to upload into', defaultDestination)
		.option('--extensions <extensions>', 'A comma delimited list of file extensions to find and upload', defaultFileExtensions)
		.option('--cache-control <seconds>', 'Optionally specify a cache control value', defaultCacheControl)
		.action(function (options) {
			uploadAssetsToS3(options).catch(utils.exit);
		});

};

module.exports.task = uploadAssetsToS3;
