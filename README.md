# n-heroku-tools (nht) [![CircleCI](https://circleci.com/gh/Financial-Times/n-heroku-tools.svg?style=svg&circle-token=33bcf2eb98fe2e875cc66de93d7e4a50369c952d)](https://circleci.com/gh/Financial-Times/n-heroku-tools)

This library is a command line tool that orchestrates [Heroku](https://www.heroku.com/) and [Amazon S3](https://aws.amazon.com/s3/) deployments for [Next](https://github.com/Financial-Times/next/wiki), based on configurations in the [Next service registry](https://next-registry.ft.com/v2/) and [Vault](https://www.vaultproject.io/).

🤖 **This file is generated automatically. If you need to make updates please modify `/scripts/readme-template.md` and afterwards run `make docs`.**

## Requirements

- Node version defined by `engines.node` in `package.json`. Run command `nvm use` to switch your local Node version to the one specified in `.nvmrc`.


## Installation

```sh
git clone git@github.com:Financial-Times/n-heroku-tools.git
cd n-heroku-tools
make install
```


## Development

### Running locally

In order to run a CLI command locally you'll need to run:

```sh
./bin/n-heroku-tools.js COMMAND
```

For example, to check if a service is up and running:

```sh
./bin/n-heroku-tools.js gtg ft-next-health-eu

# ⏳ polling: http://ft-next-health-eu.herokuapp.com/__gtg
# ✅ http://ft-next-health-eu.herokuapp.com/__gtg ok!
```

### Testing

In order to run the tests locally you'll need to run:

```sh
make test
```

### Install from NPM

```sh
npm install --save-dev @financial-times/n-heroku-tools
```

### Usage

Use `nht` or `n-heroku-tools` on the command line:

```
Usage: n-heroku-tools [options] [command]

Options:
  -V, --version                                       output the version number
  -h, --help                                          output usage information

Commands:
  configure [options] [source] [target]               gets environment variables from Vault and uploads them to the current app
  deploy-static [options] <source> [otherSources...]  Deploys static <source> to S3.  Requires AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars
  run [options]                                       Runs the local app through the router
  rebuild [options] [apps...]                         DEPRECATED. Trigger a rebuild of the latest master on Circle
  gtg [app]                                           Runs gtg checks for an app
  review-app [options] [appName]                      Create or find an existing heroku review app and print out the app name. [appName] is the package.json name (which is also the value of VAULT_NAME). On the first build of a branch, Heroku will create a review app with a build. On subsequent builds, Heroku will automatically generate a new build, which this task looks for. See https://devcenter.heroku.com/articles/review-apps-beta for more details of the internals
  upload-assets-to-s3 [options]                       Uploads a folder of assets to an S3 bucket
  *
```
