# next-build-tools
**WARNING:** next-build-tools should **never** be globally installed.  Always install as a devDependency of your application.


  Usage: next-build-tools [options] [command]


  Commands:

    deploy [options] [app]                              runs haikro deployment scripts with sensible defaults for Next projects
    configure [options] [source] [target]               downloads environment variables from next-config-vars and uploads them to the current app
    scale [options] [source] [target]                   downloads process information from next-service-registry and scales/sizes the application servers
    provision [app]                                     provisions a new instance of an application server
    destroy [options] [app]                             deletes the app from heroku
    purge [options] [url]                               DEPRECATED.  Please switch to ‘fastly-tools’.  Purges the given url from the Fastly cache.  Requires a FASTLY_KEY environment variable set to your fastly api key
    deploy-vcl [options] [folder]                       DEPRECATED.  Please switch to ‘fastly-tools’.  Deploys VCL in [folder] to the specified fastly service.  Requires FASTLY_KEY env var
    nightwatch [options] [test]                         runs nightwatch with some sensible defaults
    deploy-hashed-assets                                deploys hashed asset files to S3 (if AWS keys set correctly)
    deploy-static [options] <source> [otherSources...]  Deploys static <source> to [destination] on S3 (where [destination] is a full S3 URL).  Requires AWS_ACCESS and AWS_SECRET env vars
    run [options]                                       Runs the local app through the router
    rebuild [options] [apps...]                         Trigger a rebuild of the latest master on Circle
    test-urls [options] [app]                           Tests that a given set of urls for an app respond as expected. Expects the config file ./test/smoke.js to exist
    bottle [options] [increment]                        releases a major, minor, patch or prerelease of a next component (similar to npm version + npm publish)
    ship [options]                                      Ships code.  Deploys using pipelines, also running the configure and scale steps automatically
    float [options]                                     Deploys code to a test app and checks it doesn't die
    drydock [options] [name]                            Creates a new pipeline with a staging and EU production app
    *                                                 

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

## Development
Warning the README.md is automatically generated.  Run `make docs` to update.
