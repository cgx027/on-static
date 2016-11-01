// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe('database service', function () {
    var sandbox = sinon.sandbox.create();
    var database;
    var lowdb;

    var testData = {
        "images": [
            {
                "id": "b6b3e3be-c799-4af4-86c8-09a99d3aa7c7",
                "iso": "centos-7.0.iso",
                "name": "centos",
                "version": "7.0",
                "status": "OK"
            },
            {
                "id": "c6b3e3be-c799-4af4-86c8-09a99d3aa7c7",
                "iso": "centos-8.0.iso",
                "name": "centos",
                "version": "8.0",
                "status": "OK"
            }
        ]
    };

    var allImages = testData.images;
    var image = allImages[0];

    before('setup config', function () {
        setConfig();
        database = helper.injector.get('Services.Database');
        lowdb = helper.injector.get('lowdb');
    });

    after('restore config', function () {
        sandbox.restore();
        redatabaseConfig();
    });

    function setConfig() {
        return helper.injector.get('Services.Configuration')
            .set('inventoryFile', './spec/data/inventory.json');
    }

    function redatabaseConfig() {
        return helper.injector.get('Services.Configuration')
            .set('inventoryFile', './inventory.json');
    }

    beforeEach("reset stubs", function () {
    });

    describe("test database service", function () {

        it("should return all database", function () {
            return database.load(function(){
                return database.getAllImages()
                    .should.eventually.deep.equal(allImages);
            });
        });

        it("should return one queried images", function () {
            var query = {
                name: 'centos',
                version: '7.0'
            };

            return database.findOneImage(query)
                .then(function(){
                    return database.findOneImage(query)
                        .should.eventually.deep.equal(image);
                });
        });

        it("should return one queried images with name and version", function () {
            var name = 'centos',
                version = '7.0';

            return database.findOneImageByNameVersion(name, version)
                .then(function(){
                    return database.findOneImage({name: name, version: version})
                        .should.eventually.deep.equal(image);
                });
        });

        it("should update selected image", function () {
            var query = {
                name: 'centos',
                version: '7.0'
            };

            var data = {status: "Failed"};
            var updatedImage = {
                "id": "b6b3e3be-c799-4af4-86c8-09a99d3aa7c7",
                "iso": "centos-7.0.iso",
                "name": "centos",
                "version": "7.0",
                "status": "Failed"
            };

            database.updateImage(query, data)
                .then(function(){
                    return database.findOneImage(query)
                        .should.eventually.deep.equal(updatedImage);
                })
                .then(function(){
                    // restore test data
                    return database.updateImage(query, image);
                });
        });

        it("should update status of selected image", function () {
            var name = 'centos',
                version = '7.0';

            var status = 'Failed';

            var updatedImage = {
                "id": "b6b3e3be-c799-4af4-86c8-09a99d3aa7c7",
                "iso": "centos-7.0.iso",
                "name": "centos",
                "version": "7.0",
                "status": "Failed"
            };

            database.updateImageStatus(name, version, status)
                .then(function(){
                    return database.findOneImageByNameVersion(name, version)
                        .should.eventually.deep.equal(updatedImage);
                })
                .then(function(){
                    // restore test data
                    return database.updateImageStatus(name, version, image);
                });
        });

        it("should delete selected image", function () {
            var query = {
                name: 'centos',
                version: '7.0'
            };

            return database.deleteImage(query)
                .then(function(){
                    return database.findOneImage(query)
                        .should.eventually.deep.equal();
                })
                .then(function(){
                    // restore test data
                    return database.addImage(image);
                });
        });

    });
});
