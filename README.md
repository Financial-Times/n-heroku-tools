# next-build-tools

  Usage: next-build-tools [options] [command]


  Commands:

    clean                                  runs git clean -fxd
    deploy [app]                           runs haikro deployment scripts with sensible defaults for Next projects
    configure [options] [source] [target]  downloads environment variables from next-config-vars and uploads them to the current app
    provision [app]                        provisions a new instance of an application server
    verify                                 internally calls origami-build-tools verify with some Next specific configuration (use only for APPLICATIONS.  Front End components should continue to use origami-build-tools verify)
    verify-layout-deps [options]           Verifies that the application has installed bower components needed by ft-next-express' templates
    verify-dependencies [options]          Verifies that the application meets various restrictions on dependencies not enforcable using bower and npm alone
    nightwatch [options] [test]            runs nightwatch with some sensible defaults
    deploy-hashed-assets                   deploys hashed asset files to S3 (if AWS keys set correctly)
    build [options]                        build javascript and css
    destroy [app]                          deletes the app from heroku
    purge [options] [url]                  purges the given url from the Fastly cache.  Requires a FASTLY_KEY environment variable set to your fastly api key
    deploy-vcl [options] [folder]          Deploys VCL in [folder] to the specified fastly service.  Requires FASTLY_KEY env var
    enable-preboot [app]                   enables prebooting of an application to smooth over deploys
    *

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

## Development
Warning the README.md is automatically generated.  Run `make docs` to update.
