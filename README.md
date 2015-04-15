# next-build-tools

  Usage: next-build-tools [options] [command]


  Commands:

    clean                                  runs git clean -fxd
    deploy [app]                           runs haikro deployment scripts with sensible defaults for Next projects
    configure [options] [source] [target]  downloads environment variables from next-config-vars and uploads them to the current app
    provision [app]                        provisions a new instance of an application server
    verify                                 internally calls origami-build-tools verify with some Next specific configuration (use only for APPLICATIONS.  Front End components should continue to use origami-build-tools verify)
    verify-layout-deps [options]           Verifies that the application has installed compatible versions of bower components which provide templates used by page layouts contained in ft-next-express
    nightwatch [options] [test]            runs nightwatch with some sensible defaults
    deploy-hashed-assets                   deploys hashed asset files to S3 (if AWS keys set correctly)
    build                                  build javascript and css
    destroy [app]                          deletes the app from heroku
    purge [options] [url]                  purges the given url from the Fastly cache.  Requires a FASTLY_KEY environment variable set to your fastly api key
    enable-preboot [app]                   enables prebooting of an application to smooth over deploys
    deploy-vcl [options] [folder]          Deploys VCL in [folder] to the fastly service given in the FASTLY_SERVICE_ID env var.  Also requires FASTLY_KEY env var

    *                                      

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

## Development
Warning the README.md is automatically generated.  Run `make docs` to update.
