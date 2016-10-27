// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe('store service', function () {
    var spyLoad, spyGetAll, spyGet, spyGetAllImages, spyFindOneImage,
        spySet, spyUpset;
    var sandbox = sinon.sandbox.create();
    var store;

    var testData = {
        "images": [
            {
                "id": "b6b3e3be-c799-4af4-86c8-09a99d3aa7c7",
                "iso": "centos-7.0.iso",
                "name": "centos",
                "version": "7.0",
                "status": "OK"
            }
        ]
    };

    var allImages = testData['images'];
    var image = allImages[0];

    before('setup config', function () {
        setConfig();
        store = helper.injector.get('Services.Store');
        spyLoad = sandbox.spy(store, 'load');
        spyGet = sandbox.spy(store, 'get');
        spyGetAll = sandbox.spy(store, 'getAll');
        spyGetAllImages = sandbox.spy(store, 'getAllImages');
        spyFindOneImage = sandbox.spy(store, 'findOneImage');
        spySet = sandbox.spy(store, 'set');
        // spyUpset = sandbox.spy(store, 'upset');
    });

    after('restore config', function () {
        sandbox.restore();
        restoreConfig();
    });

    function setConfig() {
        return helper.injector.get('Services.Configuration')
            .set('inventoryFile', './spec/data/inventory.json');
    }

    function restoreConfig() {
        return helper.injector.get('Services.Configuration')
            .set('inventoryFile', './inventory.json');
    }

    beforeEach("reset stubs", function () {
    });

    describe("test store service", function () {

        it("should load store from file", function () {

            store.load();
            expect(spyLoad).to.be.calledOnce
                .and.returned(testData);
            expect(store.contentCache).to.be.deep.equal(testData)
        });

        it("should return all store", function () {

            store.getAll();
            expect(spyGetAll).to.be.calledOnce
                .and.returned(testData);
        });

        it("should return value with key query", function () {

            store.get('images');
            expect(spyGet).to.be.calledOnce
                .and.returned(allImages);
        });

        it("should return one queried images", function () {
            var query = {
                name: 'centos',
                version: '7.0' 
            }

            store.findOneImage(query);
            expect(spyFindOneImage).to.be.calledOnce
                .and.returned(image);
        });

    });
});
