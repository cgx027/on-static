// Copyright 2016, EMC, Inc.

'use strict';

module.exports = storeServiceFactory;

storeServiceFactory.$provide = 'Services.Store';
storeServiceFactory.$inject = [
    'assert',
    'Errors',
    'Services.Configuration',
    'Promise',
    'fs',
    'path',
    'Logger'
];

function storeServiceFactory(
    assert,
    Errors,
    configuration,
    Promise,
    fs,
    path,
    Logger
) {
    var logger = Logger.initialize("storeService");

    var confFilePath = path.join(process.cwd(),
        configuration.get('inventoryFile', "./inventory.json")
    );

    function jsonParser(str) {
        try {
            return JSON.parse(str)
        } catch (err) {
            throw new Error('error parsing inventory file')
        }
    }

    function storeService() {
        this.contentCache = {};
        this.load();
    }

    storeService.prototype.load = function () {
        if (fs.existsSync(confFilePath)) {

            this.contentCache = jsonParser(
                fs.readFileSync(confFilePath, 'utf8')
            );

            logger.info('Store file loaded:' + confFilePath);

            return this.contentCache;
        } else {
            logger.error('Failed to load Store file:' + confFilePath);
            process.exit(1);
        }
    };

    storeService.prototype.set = function set(key, value) {
        assert.string(key, 'key');
        nconf.set(key, value);
        return this;
    };

    storeService.prototype.get = function get(key, defaults) {
        assert.string(key, 'key');

        if (_.has(this.contentCache, key)) {
            return this.contentCache[key];
        } else {
            logger.info('key ' + key + ' is not found, using default: ' + defaults);
            return defaults;
        }
    };

    storeService.prototype.getAll = function getAll() {
        return this.contentCache;
    };

    storeService.prototype.getAllImages = function getAllImages() {
        return this.get('images');
    };

    storeService.prototype.findOneImage = function findOneImage() {
        var images = this.getAllImages();
    };

    return new storeService();
}
