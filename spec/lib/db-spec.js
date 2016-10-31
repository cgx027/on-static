// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe('database service', function () {
    var spyLoad, spyGetAllImages, spyFindOneImage, spyUpdateImage;
    var sandbox = sinon.sandbox.create();
    var database;
    var lowdb;
    var spyLowdb;

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
        spyLoad = sandbox.spy(database, 'load');
        spyGetAllImages = sandbox.spy(database, 'getAllImages');
        spyFindOneImage = sandbox.spy(database, 'findOneImage');
        spyUpdateImage = sandbox.spy(database, 'updateImage');
        spyLowdb = sandbox.spy(lowdb);
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

            var ret= database.load().getAllImages();
            expect(spyGetAllImages).to.be.calledOnce
                .and.returned(allImages);
            console.log(ret);
        });

        it("should return one queried images", function () {
            var query = {
                name: 'centos',
                version: '7.0'
            };

            database.findOneImage(query);
            expect(spyFindOneImage).to.be.calledOnce
                .and.returned(image);
        });

        it("should update selected image", function () {
            var query = {
                name: 'centos',
                version: '7.0'
            };

            var data = {
                status: 'Failed'
            };

            var returnImage = {
                "id": "b6b3e3be-c799-4af4-86c8-09a99d3aa7c7",
                "iso": "centos-7.0.iso",
                "name": "centos",
                "version": "7.0",
                "status": "Failed"
            };
            database.updateImage(query, data);
            expect(spyUpdateImage).to.be.calledOnce
                .and.returned(returnImage);

            // restore test data
            database.updateImage(query, image);
        });

    });
});
