# n-heroku-tools
This library is a command line tool that orchestrates [Heroku](https://www.heroku.com/) and [Amazon S3](https://aws.amazon.com/s3/) deployments for [Next](https://github.com/Financial-Times/next/wiki), based on configuration in the [Next service registry](https://next-registry.ft.com/v2/) and [Vault](https://www.vaultproject.io/).
### Installation
In order to use this tool, run
```
npm install @financial-times/n-heroku-tools --save-dev
```

### Development
 ### Usage
In order to use `n-heroku-tools` the following commands are available in your command line:

  Usage: n-heroku-tools [options] [command]


  Commands:

    deploy [options] [app]                              runs haikro deployment scripts with sensible defaults for Next projects
    configure [options] [source] [target]               gets environment variables from Vault and uploads them to the current app
    scale [options] [source] [target]                   downloads process information from next-service-registry and scales/sizes the application servers
    provision [options] [app]                           provisions a new instance of an application server
    destroy [options] [app]                             deletes the app from heroku
    deploy-hashed-assets [options]                      deploys hashed asset files to S3 (if AWS keys set correctly)
    deploy-static [options] <source> [otherSources...]  Deploys static <source> to S3.  Requires AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars
    run [options]                                       Runs the local app through the router
    rebuild [options] [apps...]                         Trigger a rebuild of the latest master on Circle
    test-urls [options] [app]                           Tests that a given set of urls for an app respond as expected. Expects the config file ./test/smoke.js to exist
    ship [options]                                      Ships code.  Deploys using pipelines, also running the configure and scale steps automatically
    float [options]                                     Deploys code to a test app and checks it doesn't die
    drydock [options] [name]                            Creates a new pipeline with a staging and EU production app
    smoke [options] [app]                               [DEPRECATED - Use n-test directly]. Tests that a given set of urls for an app respond as expected. Expects the config file ./test/smoke.js to exist
    *                                                 

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

*Note*: The README.md is automatically generated.  Run `make docs` to update it.
