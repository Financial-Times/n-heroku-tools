# next-build-tools

  Usage: next-build-tools [options] [command]


  Commands:

    deploy [app]                                        runs haikro deployment scripts with sensible defaults for Next projects
    configure [options] [source] [target]               downloads environment variables from next-config-vars and uploads them to the current app
    provision [app]                                     provisions a new instance of an application server
    verify [options]                                    internally calls origami-build-tools verify with some Next specific configuration (use only for APPLICATIONS.  Front End components should continue to use origami-build-tools verify)
    nightwatch [options] [test]                         runs nightwatch with some sensible defaults
    deploy-hashed-assets                                deploys hashed asset files to S3 (if AWS keys set correctly)
    build [options]                                     build javascript and css
    destroy [app]                                       deletes the app from heroku
    purge [options] [url]                               purges the given url from the Fastly cache.  Requires a FASTLY_KEY environment variable set to your fastly api key
    deploy-vcl [options] [folder]                       Deploys VCL in [folder] to the specified fastly service.  Requires FASTLY_KEY env var
    run                                                 Runs the local app through the router
    deploy-static [options] <source> [otherSources...]  Deploys static <source> to [destination] on S3 (where [destination] is a full S3 URL).  Requires AWS_ACCESS and AWS_SECRET env vars
    *                                                   

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

## Development
Warning the README.md is automatically generated.  Run `make docs` to update.
