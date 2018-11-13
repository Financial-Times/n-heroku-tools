module.exports = {
	getGithubArchiveRedirectUrl: jest.fn(() => {
		return Promise.resolve('https://github.com/some-tarball-link');
	})
};
