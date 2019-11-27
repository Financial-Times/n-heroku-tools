const fs = require('fs');
const path = require('path');
const glob = require('glob');
const mime = require('mime');
const aws = require('aws-sdk');

const defaultDirectory = 'public';
const defaultBucket = 'ft-next-hashed-assets-prod';
const defaultDestination = 'hashed-assets/uploaded';
const defaultFileExtensions = ['js', 'css', 'map', 'gz', 'br'].join();
const defaultCacheControl = 'public, max-age=31536000, stale-while-revalidate=60, stale-if-error=3600';

function getFileType (filename) {
	// We need to know the original file type so ignore any compression
	const originalFile = filename.replace(/\.(br|gz)$/, '');
	const ext = path.extname(originalFile);

	return mime.getType(ext);
}

function getFileEncoding (filename) {
	const ext = path.extname(filename);

	switch (ext) {
		case '.gz':
			return 'gzip';
		case '.br':
			return 'br';
	}
}

async function uploadFile (file, opts, s3) {
	const basename = path.basename(file);
	const type = getFileType(basename);
	const encoding = getFileEncoding(basename);
	const key = path.posix.join(opts.destination, basename);

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

	const s3 = new aws.S3({
		accessKeyId: opts.accessKeyId,
		secretAccessKey: opts.secretAccessKey,
		params: { Bucket: opts.bucket }
	});

	return Promise.all(files.map((file) => uploadFile(file, opts, s3)));
}

module.exports = function (program, utils) {
	program
		.command('upload-assets-to-s3')
		.description('Uploads a folder of assets to an S3 bucket')
		.option('--accessKeyId <accessKeyId>', 'AWS access key ID')
		.option('--secretAccessKey <secretAccessKey>', 'AWS secret access key')
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
