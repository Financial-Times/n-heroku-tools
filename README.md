# next-build-tools

  Usage: next-build-tools [options] [command]


  Commands:

    clean                                  runs git clean -fxd
    deploy [app]                           runs haikro deployment scripts with sensible defaults for Next projects
    deploy-hashed-assets                   deploys hashed asset files to github.io and S3 (if AWS keys set correctly)
    configure [options] [source] [target]  downloads environment variables from next-config-vars and uploads them to the current app
    download-configuration <app>           downloads environment variables from app from Heroku to make adding them to the next-config-vars service easier
    provision [app]                        provisions a new instance of an application server
    verify                                 internally calls origami-build-tools verify with some Next specific configuration (use only for APPLICATIONS.  Front End components should continue to use origami-build-tools verify)
    verify-layout-deps                     Verifies that the application has installed compatible versions of bower components which provide templates used by page layouts contained in ft-next-express
    nightwatch [options] [test]            runs nightwatch with some sensible defaults
    deploy-hashed-assets                   deploys ./hashed-assets/ to <app-name> on GitHub
    destroy [app]                          deletes the app from heroku
    *                                      

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
