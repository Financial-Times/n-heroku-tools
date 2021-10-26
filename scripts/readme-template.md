# n-heroku-tools (nht) [![CircleCI](https://circleci.com/gh/Financial-Times/n-heroku-tools.svg?style=svg&circle-token=33bcf2eb98fe2e875cc66de93d7e4a50369c952d)](https://circleci.com/gh/Financial-Times/n-heroku-tools)

⚠️ **`n-heroku-tools` is unsupported. FT.com projects should migrate to [Tool Kit](https://github.com/financial-times/dotcom-tool-kit).

This library is a command line tool that orchestrates [Heroku](https://www.heroku.com/) and [Amazon S3](https://aws.amazon.com/s3/) deployments for [Next](https://github.com/Financial-Times/next/wiki), based on configurations in the [Next service registry](https://next-registry.ft.com/v2/) and [Vault](https://www.vaultproject.io/).

🤖 **This file is generated automatically. If you need to make updates please modify `/scripts/readme-template.md` and afterwards run `make docs`.**

## Requirements

* Node 10.x


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
{{ CLI_HELP }}```
