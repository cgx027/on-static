// Copyright 2016, EMC, Inc.

'use strict';

module.exports = DatabaseServiceFactory;

DatabaseServiceFactory.$provide = 'Services.Database';
DatabaseServiceFactory.$inject = [
    'assert',
    'Errors',
    'Services.Configuration',
    'Promise',
    'fs',
    'path',
    'Logger',
    'lowdb'
];

function DatabaseServiceFactory(
    assert,
    Errors,
    configuration,
    Promise,
    fs,
    path,
    Logger,
    lowdb
) {
    var logger = Logger.initialize("DatabaseService");

    var confFilePath = path.join(process.cwd(),
        configuration.get('inventoryFile', "./inventory.json")
    );

    function DatabaseService() {
        this.load();
    }

    DatabaseService.prototype.load = function () {
        if (fs.existsSync(confFilePath)) {

            this.db = lowdb(confFilePath);
            logger.info('database file loaded:' + confFilePath);
            return this;
        } else {
            logger.error('Failed to load database file:' + confFilePath);
            process.exit(1);
        }
    };

    DatabaseService.prototype.getAllImages = function getAllImages() {
        return this.db.get('images').value();
    };

    DatabaseService.prototype.findOneImage = function findOneImage(query) {
        var images = this.db.get('images').find(query).value();
        return images.length > 0 ? images[0] : images;
    };

    DatabaseService.prototype.updateImage = function updateImage(query, image) {
        var images = this.db.get('images').find(query).assign(image).value();
        return images.length > 0 ? images[0] : images;
    };

    return new DatabaseService();
}
