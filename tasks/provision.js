
var util   = require('util'),
    Heroku = require('heroku-client')
    debug  = require('debug')('next-build-tools');

// create a Heroku application server
module.exports = function () {

    var build = process.env.CI_BUILD_NUMBER;
    var branch = process.env.CI_BRANCH;
    var project = process.env.PROJECT;
    var heroku_auth = process.env.HEROKU_API_TOKEN;

    if (!project || !branch || !build || !heroku_auth) {
        throw "You need to set HEROKU_API_TOKEN, PROJECT, CI_BRANCH, and CI_BUILD_NUMBER environment variables";
    }

    var server = {
        name: util.format('%s-%s-%s', project, branch, build),
        region: 'eu',
        organization: 'financial-times'
    }

    var heroku = new Heroku({ token: heroku_auth });
    heroku.organizations().apps().create(server, function (err, app) {
        if (err) {
            throw new Error(err);
        }
        debug('Successfully created app', app);
    });

};
