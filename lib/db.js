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

    var imagesKey = 'images';
    var confFilePath = path.join(process.cwd(),
        configuration.get('inventoryFile', "./inventory.json")
    );

    function DatabaseService() {
        this.load();
        return this;
    }

    DatabaseService.prototype.load = function () {
        if (fs.existsSync(confFilePath)) {

            this.db = lowdb(confFilePath);
            logger.info('database file loaded:' + confFilePath);
            return Promise.resolve()
                .then(function(){
                    return this;
                });
        } else {
            logger.error('Failed to load database file:' + confFilePath);
            process.exit(1);
        }
    };

    DatabaseService.prototype.getAllImages = function getAllImages() {
        var self = this;
        return Promise.resolve()
            .then(function() {
                return self.db.get(imagesKey).value();
            });
    };

    DatabaseService.prototype.findOneImage = function findOneImage(query) {
        var self = this;
        return Promise.resolve()
            .then(function(){
                return self.db.get(imagesKey).find(query).value();
            });
    };

    DatabaseService.prototype.findOneImageByNameVersion = function findOneImageByNameVersion
    (name, version) {
        var self = this;

        var query = {name: name, version: version};

        return Promise.resolve()
            .then(function(){
                return self.db.get(imagesKey).find(query).value();
            });
    };


    DatabaseService.prototype.deleteImage = function deleteImage(query) {
        var self = this;
        return Promise.resolve()
            .then(function(){
                return self.db.get(imagesKey).remove(query).value();
            });
    };

    DatabaseService.prototype.updateImage = function updateImage(query, image) {
        var self = this;
        return Promise.resolve()
            .then(function(){
                return self.db.get(imagesKey).find(query).assign(image).value();
            });
    };

    DatabaseService.prototype.updateImageStatus = function updateImageStatus(
        name, version, status) {
            var self = this;
            var query = {name: name, version: version};
            return Promise.resolve()
                .then(function(){
                    return self.db.get(imagesKey).find(query)
                        .assign({status: status}).value();
                });
    };

    DatabaseService.prototype.addImage = function addImage(image) {
        var self = this;
        return Promise.resolve()
            .then(function(){
                return self.db.get(imagesKey).push(image).value();
            });
    };

    return new DatabaseService();
}