// Copyright 2016, EMC, Inc.

'use strict';

module.exports = configurationServiceFactory;

configurationServiceFactory.$provide = 'Services.Configuration';
configurationServiceFactory.$inject = [
    'assert',
    'nconf',
    'Promise',
    'fs',
    'path',
    'Logger'
];

function configurationServiceFactory(
    assert,
    nconf,
    Promise,
    fs,
    path,
    Logger
) {
    var logger = Logger.initialize("configurationService");

    var confFilePath = path.resolve('./config.json');

    function ConfigurationService() {
        this.load();
    }

    ConfigurationService.prototype.load = function () {
        if (fs.existsSync(confFilePath)) {

            nconf.file("file", { 'file': confFilePath });
            logger.info('Configuration file loaded:' + confFilePath);
        } else {
            logger.error('Failed to load configuration file:' + confFilePath);
            process.exit(1);
        }
    };

    ConfigurationService.prototype.set = function set(key, value) {
        assert.string(key, 'key');
        nconf.set(key, value);
        return this;
    };

    ConfigurationService.prototype.get = function get(key, defaults) {
        assert.string(key, 'key');
        var value = nconf.get(key);

        if (value === undefined) {
            logger.info('key ' + key + ' is not found, using default: ' + defaults);
            return defaults;
        }
        return value;
    };

    // ConfigurationService.prototype.save = function () {
    //     var self = this;
    //     nconf.save(function (err) {
    //         fs.readFile(confFilePath, function (err, data) {
    //             logger.info('configuration saved: ' + data.toString().replace(/[\n\r]+/g, ' '));
    //         });
    //     });
    // };

    return new ConfigurationService();
}