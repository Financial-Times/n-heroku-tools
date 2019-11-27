const mockS3Upload = jest.fn().mockImplementation((data, callback) => {
	callback(null, { Location: data.Key });
});

const mockGlobSync = jest.fn().mockReturnValue([
	'public/stylesheet.css',
	'public/stylesheet.css.br',
	'public/stylesheet.css.gz',
	'public/scripts.js',
	'public/scripts.js.br',
	'public/scripts.js.gz'
]);

jest.mock('aws-sdk', () => {
	return {
		S3: jest.fn(() => ({
			upload: mockS3Upload
		}))
	};
});

jest.mock('glob', () => {
	return {
		sync: mockGlobSync
	};
});

jest.mock('fs', () => {
	return {
		createReadStream: jest.fn()
	};
});

const aws = require('aws-sdk');
const { task } = require('./upload-assets-to-s3');

describe('upload-assets-to-s3', () => {
	beforeAll(() => {
		return task({
			accessKeyId: 123,
			secretAccessKey: 456,
			directory: 'public/',
			bucket: 'bucket-name',
			destination: 'bucket-folder/',
			extensions: 'css,js,br,gz',
			cacheControl: 'max-age=123'
		});
	});

	afterAll(() => {
		jest.resetModules();
	});

	it('initialises an S3 client with credentials', () => {
		expect(aws.S3).toHaveBeenCalledWith(
			expect.objectContaining({
				accessKeyId: 123,
				secretAccessKey: 456
			})
		);
	});

	it('sets the mime type for each file', () => {
		expect(mockS3Upload).nthCalledWith(
			1,
			expect.objectContaining({
				Key: 'bucket-folder/stylesheet.css',
				ContentType: 'text/css; charset=utf-8'
			}),
			expect.any(Function)
		);

		expect(mockS3Upload).nthCalledWith(
			4,
			expect.objectContaining({
				Key: 'bucket-folder/scripts.js',
				ContentType: 'application/javascript; charset=utf-8'
			}),
			expect.any(Function)
		);
	});

	it('sets the original mime type for compressed files', () => {
		expect(mockS3Upload).nthCalledWith(
			2,
			expect.objectContaining({
				Key: 'bucket-folder/stylesheet.css.br',
				ContentType: 'text/css; charset=utf-8'
			}),
			expect.any(Function)
		);

		expect(mockS3Upload).nthCalledWith(
			6,
			expect.objectContaining({
				Key: 'bucket-folder/scripts.js.gz',
				ContentType: 'application/javascript; charset=utf-8'
			}),
			expect.any(Function)
		);
	});

	it('sets the encoding for compressed files', () => {
		expect(mockS3Upload).nthCalledWith(
			2,
			expect.objectContaining({
				Key: 'bucket-folder/stylesheet.css.br',
				ContentEncoding: 'br'
			}),
			expect.any(Function)
		);

		expect(mockS3Upload).nthCalledWith(
			6,
			expect.objectContaining({
				Key: 'bucket-folder/scripts.js.gz',
				ContentEncoding: 'gzip'
			}),
			expect.any(Function)
		);
	});
});
