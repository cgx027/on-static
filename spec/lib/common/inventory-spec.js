// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe('inventory service', function () {
    var path = helper.injector.get('path');
    var inventory;
    var configuration;
    var db;

    var sandbox = sinon.sandbox.create();
    var fakeStaticDir = "./spec/fake-static";
    var fakeIsoDir = "./spec/fake-static/iso";
    var fakeMKDir = "./spec/fake-static/common";
    var fakeInventoryFile = "./spec/data/inventory.json";

    var cwd = process.cwd();
    var fakeStaticDirAbs = path.join(cwd, "./spec/fake-static/iso");
    var fakeIsoDirAbs = path.join(cwd, "./spec/fake-static/iso");
    var fakeMKDirAbs = path.join(cwd, "./spec/fake-static/common");
    var fakeIsoFile = path.join(cwd, "./spec/data/fake.iso");
    var fakeMicrokernelFile = path.join(cwd, "./spec/data/fake.microkernel");
    var fakeInventoryFileAbs = path.join(cwd, fakeInventoryFile);

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
    var image = allImages[1];

    before('setup config', function () {
        setupConfig();

        inventory = helper.injector.get('Services.Inventory');
        db = helper.injector.get('Services.Database');
    });

    after('restore config', function () {
        sandbox.restore();
        restoreConfig();
    });

    function setupConfig() {
        configuration = helper.injector.get('Services.Configuration');
        configuration.set("httpFileServiceRootDir", fakeStaticDir)
            .set("isoDir", fakeIsoDir)
            .set("microkernelDir", fakeMKDir)
            .set("inventoryFile", fakeInventoryFile);
    }

    function restoreConfig() {
        configuration.set("httpFileServiceRootDir", './static')
            .set("isoDir", './static/iso')
            .set("microkernelDir", './static/common')
            .set("inventoryFile", './inventory.json');
    }

    beforeEach("reset stubs", function () {
    });

    describe("test database service", function () {

        it("should initialize", function () {
            sandbox.spy(inventory, 'initialize');
            sandbox.spy(db, 'load');

            inventory.initialize();
            expect(inventory.inventoryFilePath).to.equal(fakeInventoryFileAbs);
            expect(db.load).to.have.been.calledOnce;
        });


        // it("should return one queried images", function () {
        //     var query = {
        //         name: 'centos',
        //         version: '8.0'
        //     };
        //
        //     return database.findOneImageByQuery(query)
        //         .should.eventually.deep.equal(image);
        // });
        //
        // it("should return one queried images with name and version", function () {
        //     var name = 'centos',
        //         version = '8.0';
        //
        //     return database.findOneImageByNameVersion(name, version)
        //         .should.eventually.deep.equal(image);
        // });
        //
        // it("should update selected image", function () {
        //     var query = {
        //         name: 'centos',
        //         version: '8.0'
        //     };
        //
        //     var data = {status: "Failed"};
        //     var updatedImage = {
        //         "id": "c6b3e3be-c799-4af4-86c8-09a99d3aa7c7",
        //         "iso": "centos-8.0.iso",
        //         "name": "centos",
        //         "version": "8.0",
        //         "status": "Failed"
        //     };
        //
        //     database.updateImage(query, data)
        //         .then(function(){
        //             return database.findOneImageByQuery(query)
        //                 .should.eventually.deep.equal(updatedImage);
        //         })
        //         .then(function(){
        //             // restore test data
        //             return database.updateImage(query, image);
        //         });
        // });
        //
        // it("should update status of selected image", function () {
        //     var name = 'centos',
        //         version = '8.0';
        //
        //     var status = 'Failed';
        //
        //     var updatedImage = {
        //         "id": "c6b3e3be-c799-4af4-86c8-09a99d3aa7c7",
        //         "iso": "centos-8.0.iso",
        //         "name": "centos",
        //         "version": "8.0",
        //         "status": "Failed"
        //     };
        //
        //     database.updateImageStatus(name, version, status)
        //         .then(function(){
        //             return database.findOneImageByNameVersion(name, version)
        //                 .should.eventually.deep.equal(updatedImage);
        //         })
        //         .then(function(){
        //             // restore test data
        //             return database.updateImageStatus(name, version, "OK");
        //         });
        // });
        //
        // it("should delete selected image", function () {
        //     var query = {
        //         name: 'centos',
        //         version: '8.0'
        //     };
        //
        //     return database.deleteImage(query)
        //         .then(function(){
        //             return database.findOneImageByQuery(query)
        //                 .should.eventually.deep.equal();
        //         })
        //         .then(function(){
        //             // restore test data
        //             return database.addImage(image);
        //         });
        // });
    });
});
