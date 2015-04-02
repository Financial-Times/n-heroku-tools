# next-build-tools

  Usage: next-build-tools [options] [command]


  Commands:

    clean                                  runs git clean -fxd
    deploy [app]                           runs haikro deployment scripts with sensible defaults for Next projects
    configure [options] [source] [target]  downloads environment variables from next-config-vars and uploads them to the current app
    download-configuration <app>           downloads environment variables from app from Heroku to make adding them to the next-config-vars service easier
    provision [app]                        provisions a new instance of an application server
    verify                                 internally calls origami-build-tools verify with some Next specific configuration (use only for APPLICATIONS.  Front End components should continue to use origami-build-tools verify)
    nightwatch [options]                   runs nightwatch with some sensible defaults
    destroy [app]                          deletes the app from heroku
    purge [options]                        purges the given url from the Fastly cache.  Requires a FASTLY_KEY environment variable set to your fastly api key
    *                                      

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
