# n-heroku-tools
**WARNING:** n-heroku-tools should **never** be globally installed.  Always install as a devDependency of your application.

For patches to NBT 5 please make PRs to the ‘nbt-five’ branch and release from there.


  Usage: n-heroku-tools [options] [command]


  Commands:

    deploy [options] [app]                              runs haikro deployment scripts with sensible defaults for Next projects
    configure [options] [source] [target]               downloads environment variables from next-config-vars and uploads them to the current app
    scale [options] [source] [target]                   downloads process information from next-service-registry and scales/sizes the application servers
    provision [app]                                     provisions a new instance of an application server
    destroy [options] [app]                             deletes the app from heroku
    nightwatch [options] [test]                         runs nightwatch with some sensible defaults
    deploy-hashed-assets                                deploys hashed asset files to S3 (if AWS keys set correctly)
    deploy-static [options] <source> [otherSources...]  Deploys static <source> to [destination] on S3 (where [destination] is a full S3 URL).  Requires AWS_ACCESS and AWS_SECRET env vars
    run [options]                                       Runs the local app through the router
    rebuild [options] [apps...]                         DEPRECATED.  Will be moved a new home soon.  Trigger a rebuild of the latest master on Circle
    test-urls [options] [app]                           Tests that a given set of urls for an app respond as expected. Expects the config file ./test/smoke.js to exist
    bottle [options] [increment]                        DEPRECATED.  Publishing to npm is now triggered by a GitHub release (via `make npm-publish` in a repo’s circle.yml)
    ship [options]                                      Ships code.  Deploys using pipelines, also running the configure and scale steps automatically
    float [options]                                     Deploys code to a test app and checks it doesn't die
    drydock [options] [name]                            Creates a new pipeline with a staging and EU production app
    *                                                 

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

## Development
Warning the README.md is automatically generated.  Run `make docs` to update.
