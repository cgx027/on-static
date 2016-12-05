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

    function DatabaseService() {
        return this;
    }

    DatabaseService.prototype.load = function (dbFilePath) {
        if (fs.existsSync(dbFilePath)) {

            this.db = lowdb(dbFilePath);
            logger.info('Database file loaded:' + dbFilePath);
            return Promise.resolve()
                .then(function(){
                    return this;
                });
        } else {
            logger.error('Failed to load database file:' + dbFilePath);
            process.exit(1);
        }
    };

    DatabaseService.prototype.findImagesByQuery = function findImagesByQuery(query) {
        var self = this;

        return Promise.resolve()
            .then(function() {
                return self.db.get(imagesKey).filter(query).value();
            });
    };

    DatabaseService.prototype.findOneImageByQuery = function findOneImageByQuery(query) {
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
            })
            .then(function(){
                return image;
            });
    };

    return new DatabaseService();
}
