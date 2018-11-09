const getGithubArchiveUrl = ({ repoName, branch }) => `https://api.github.com/repos/Financial-Times/${repoName}/tarball/${branch}`;

const getGithubArchiveRedirectUrl = ({ repoName, branch, githubToken }) => {
	const url = getGithubArchiveUrl({ repoName, branch });

	return fetch(url, {
		headers: {
			Authorization: `token ${githubToken}`
		},
		redirect: 'manual' // Don't follow redirect, just want the URL
	}).then(async res => {
		const { status } = res;
		if (status !== 302) {
			const error = await res.json();
			throw new Error(`Unexpected response for ${url} (${status}): ${JSON.stringify(error)}`);
		}

		const { headers: { _headers: { location } } } = res;
		const [ redirectUrl ] = location || [];

		return redirectUrl;
	});
};

module.exports = {
	getGithubArchiveRedirectUrl
};
