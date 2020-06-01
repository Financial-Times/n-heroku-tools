# n-heroku-tools (nht)

This library is a command line tool that orchestrates [Heroku](https://www.heroku.com/) and [Amazon S3](https://aws.amazon.com/s3/) deployments for [Next](https://github.com/Financial-Times/next/wiki), based on configuration in the [Next service registry](https://next-registry.ft.com/v2/) and [Vault](https://www.vaultproject.io/).

### Installation

To install `n-heroku-tools`, run:

```
npm install @financial-times/n-heroku-tools --save-dev
```

### Usage

Use `nht` or `n-heroku-tools` on the command line:

```
Usage: nht [options] [command]

Options:
  -V, --version                                       output the version number
  -h, --help                                          output usage information

Commands:
  configure [options] [source] [target]               gets environment variables from Vault and uploads them to the current app
  deploy-hashed-assets [options]                      deploys hashed asset files to S3 (if AWS keys set correctly)
  deploy-static [options] <source> [otherSources...]  Deploys static <source> to S3.  Requires AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars
  run [options]                                       Runs the local app through the router
  rebuild [options] [apps...]                         Trigger a rebuild of the latest master on Circle
  gtg [app]                                           Runs gtg checks for an app
  review-app [options] [appName]                      Create or find an existing heroku review app and print out the app name. [appName] is the package.json name (which is also the value of VAULT_NAME). On the first build of a branch, Heroku will create a review app with a build. On subsequent builds, Heroku will automatically generate a new build, which this task looks for. See https://devcenter.heroku.com/articles/review-apps-beta for more details of the internals
  upload-assets-to-s3 [options]                       Uploads a folder of assets to an S3 bucket
  *
```

*Note*: The README.md is automatically generated.  Run `make docs` to update it.
