// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe('northbound-api', function () {
    var Promise;
    var Errors;
    var stubNeedByIdentifier;

    var fs = helper.injector.get('fs');
    var path = helper.injector.get('path');
    var _ = helper.injector.get('_');

    var cwd = process.cwd();
    var fakeStaticDir = "./spec/fake-static";
    var fakeIsoDir = "./spec/fake-static/iso";
    var fakeMKDir = "./spec/fake-static/common";
    var fakeInventoryFile = "./spec/data/inventory.json";

    var fakeIsoDirAbs = path.join(cwd, "./spec/fake-static/iso");
    var fakeMKDirAbs = path.join(cwd, "./spec/fake-static/common");
    var fakeIsoFile = path.join(cwd, "./spec/data/fake.iso");

    var endpoints = [
        {
            "address": "0.0.0.0",
            "port": 7071,
            "routers": "northbound"
        },
        {
            "address": "0.0.0.0",
            "port": 9091,
            "routers": "southbound"
        }
    ];

    var url = 'http://localhost:7071';

    function setupConfig() {
        var configuration = helper.injector.get('Services.Configuration');

        configuration.set("httpFileServiceRootDir", fakeStaticDir);
        configuration.set("isoDir", fakeIsoDir);
        configuration.set("microkernelDir", fakeMKDir);
        configuration.set("inventoryFile", fakeInventoryFile);
    }

    function clearInventory() {
        fs.writeFileSync(path.join(cwd, fakeInventoryFile), '');
    }

    function clearDir(link){
        var fileList = fs.readdirSync(link);
        _.forEach(fileList, function(file){
            fs.unlinkSync(
                path.join(link, file)
            );
        });
    }

    function getMKFiles(){
        return getFiles(fakeMKDirAbs);
    }

    function getIsoFiles() {
        return getFiles(fakeIsoDirAbs);
    }

    function getFiles(link){
        return fs.readdirSync(link);
    }

    function clearMKFiles(){
        clearDir(fakeMKDirAbs);
    }

    function clearIsoFiles() {
        clearDir(fakeIsoDirAbs);
    }

    function prepareDir() {
        clearInventory();
        clearIsoFiles();
        clearMKFiles();
    }

    before('start HTTP server', function () {
        this.timeout(5000);

        setupConfig();
        prepareDir();

        return helper.startServer(endpoints).then(function () {
            Promise = helper.injector.get('Promise');
            Errors = helper.injector.get('Errors');
        });
    });

    after('stop HTTP server', function () {
        return helper.stopServer();
    });

    beforeEach("reset stubs", function () {
    });

    describe("Test /iso", function () {

        it("should return empty iso files", function () {

            return helper.request(url).get('/iso')
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect(function (res) {
                    expect(res.body).to.be.an("Array").with.length(0);
                });
        });

        it("should put one iso file with query parameter", function (done) {

            return helper.request(url).put('/iso?name=test.iso')
                .send(fs.readFileSync(fakeIsoFile, 'ascii'))
                .expect(200)
                .end(function (err, res) {
                    var uploadProgress = res.text;
                //     expect(res.body).to.be.an("Array").with.length(0);
                    console.log('---------------', res.text);
                //     // expect(res.body[0]).to.be.an("Object").with.property(
                //     //     'name',
                //     //     'size',
                //     //     'uploaded'
                //     //     );
                    done();
                });
        });

        it("should a list of all images", function () {

            return helper.request(url).get('/images')
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect(function (res) {
                    // expect(res.body).to.be.an("Array").with.length(1);
                    // expect(res.body[0]).to.be.an("Object").with.property(
                    //     'name',
                    //     'size',
                    //     'uploaded'
                    //     );
                });
        });
    });
});
