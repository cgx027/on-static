// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe('northbound-api', function () {
    var Promise;
    var Errors;

    var fs = helper.injector.get('fs');
    var path = helper.injector.get('path');
    var _ = helper.injector.get('_');
    var inventory;
    var uploader;
    var configuration;

    var sandbox;
    var stubGetAllIso, stubUpload, stubDeleteIso;
    var stubGetAllMicrokernel, stubDeleteMicrokernel;
    var stubFindImageByQuery, stubGetOneImageByNameVersion,
        stubDownloadIso, stubAddimage, stubDeleteImageByQuery;

    var cwd = process.cwd();
    var fakeStaticDir = "./spec/fake-static";
    var fakeIsoDir = "./spec/fake-static/iso";
    var fakeMKDir = "./spec/fake-static/common";
    var fakeInventoryFile = "./spec/data/inventory.json";

    var fakeIsoDirAbs = path.join(cwd, "./spec/fake-static/iso");
    var fakeMKDirAbs = path.join(cwd, "./spec/fake-static/common");
    var fakeIsoFile = path.join(cwd, "./spec/data/fake.iso");
    var fakeMicrokernelFile = path.join(cwd, "./spec/data/fake.microkernel");

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

    var testIso = {
        name: 'test.iso',
        size: '360.45 KB',
        uploaded: '2016-11-17T13:59:59.425Z'
    };

    var testMicrokernel = {
        name: 'test.microkernel',
        size: '17 Byte',
        uploaded: '2016-11-17T13:59:59.425Z'
    };

    var testImage = {
        name: 'ubuntu',
        version: 'trusty'
    };

    var url = 'http://localhost:7071';

    function setupMock(){
        sandbox = sinon.sandbox.create();
        inventory = helper.injector.get('Services.Inventory');
        uploader = helper.injector.get('FileUploader');

        stubGetAllIso = sandbox.spy(inventory, 'getAllIso');
        stubDeleteIso = sandbox.spy(inventory, 'deleteIso');

        stubGetAllMicrokernel = sandbox.spy(inventory, 'getAllMicrokernel');
        stubDeleteMicrokernel = sandbox.spy(inventory, 'deleteMicrokernel');

        stubUpload = sandbox.spy(uploader.prototype, 'upload');

        stubFindImageByQuery = sandbox.spy(inventory, 'findImageByQuery');
        stubGetOneImageByNameVersion = sandbox.spy(inventory, 'getOneImageByNameVersion');
        stubDeleteImageByQuery = sandbox.spy(inventory, 'deleteImageByQuery');
        stubDownloadIso = sandbox.spy(inventory, 'downloadIso');
        stubAddimage = sandbox.spy(inventory, 'addImage');
    }

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

    function getMicrokernelFiles(){
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

    function verifyMicrokernelExistance(name) {
        var fileList = getMicrokernelFiles();
        return _.contains(fileList, name);
    }

    function verifyIsoExistance(name) {
        var fileList = getIsoFiles();
        return _.contains(fileList, name);
    }

    before('setup config', function () {
        setupConfig();
        prepareDir();
        // setupMock();
    });

    beforeEach('setup mock', function () {
        // setupConfig();
        // prepareDir();
        setupMock();
    });

    after('restore config', function () {
        restoreConfig();
        // sandbox.restore();
    });

    afterEach('restore mock', function () {
        // restoreConfig();
        sandbox.restore();
    });

    before('start HTTP server', function () {
        this.timeout(5000);

        return helper.startServer(endpoints).then(function () {
            Promise = helper.injector.get('Promise');
            Errors = helper.injector.get('Errors');
        });
    });

    after('stop HTTP server', function () {
        return helper.stopServer();
    });

    describe("Test /iso", function () {

        it("should return empty iso files", function () {

            return helper.request(url).get('/iso')
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect(function (res) {
                    expect(res.body).to.be.an("Array").with.length(0);
                    expect(stubGetAllIso).to.have.been.calledOnce;
                });
        });

        it("should put one iso file with query in url", function (done) {

            return helper.request(url).put('/iso?name=' + testIso.name)
                .send(fs.readFileSync(fakeIsoFile, 'ascii'))
                .expect(200)
                .end(function (err, res) {
                    res.text.should.contain('Upload');
                    expect(stubUpload).to.have.been.calledOnce;
                    done();
                });
        });

        it("should return one iso files", function () {
            return helper.request(url).get('/iso')
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect(function (res) {
                    expect(res.body).to.be.an("Array").with.length(1);
                    expect(stubGetAllIso).to.have.been.calledOnce;
                    res.body[0].name.should.equal(testIso.name);
                    res.body[0].size.should.equal(testIso.size);
                    expect(verifyIsoExistance(testIso.name)).to.equal(true);
                });
        });

        it("should delete one iso", function () {
            return helper.request(url).delete('/iso?name=' + testIso.name)
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect(function (res) {
                    expect(res.body).to.be.an("object");
                    expect(stubDeleteIso).to.have.been.calledOnce;
                    res.body.name.should.equal(testIso.name);
                    res.body.size.should.equal(testIso.size);
                    expect(verifyIsoExistance(testIso.name)).to.equal(false);
                });
        });
    });

    describe("Test /microkernel", function () {

        it("should return empty microkernel files", function () {

            return helper.request(url).get('/microkernel')
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect(function (res) {
                    expect(res.body).to.be.an("Array").with.length(0);
                    expect(stubGetAllMicrokernel).to.have.been.calledOnce;
                });
        });

        it("should put one microkernel file with query in url", function (done) {

            return helper.request(url).put('/microkernel?name=' + testMicrokernel.name)
                .send(fs.readFileSync(fakeMicrokernelFile, 'ascii'))
                .expect(200)
                .end(function (err, res) {
                    res.text.should.contain('Upload');
                    expect(stubUpload).to.have.been.calledOnce;
                    done();
                });
        });

        it("should return one microkernel files", function () {
            return helper.request(url).get('/microkernel')
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect(function (res) {
                    expect(res.body).to.be.an("Array").with.length(1);
                    expect(stubGetAllMicrokernel).to.have.been.calledOnce;
                    res.body[0].name.should.equal(testMicrokernel.name);
                    res.body[0].size.should.equal(testMicrokernel.size);
                    expect(verifyMicrokernelExistance(testMicrokernel.name)).to.equal(true);
                });
        });

        it("should delete one microkernel", function () {
            return helper.request(url).delete('/microkernel?name=' + testMicrokernel.name)
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect(function (res) {
                    expect(res.body).to.be.an("object");
                    expect(stubDeleteMicrokernel).to.have.been.calledOnce;
                    res.body.name.should.equal(testMicrokernel.name);
                    res.body.size.should.equal(testMicrokernel.size);
                    expect(verifyMicrokernelExistance(testMicrokernel.name)).to.equal(false);
                });
        });
    });

    describe("Test /Images", function () {

        it("should return empty Images files", function () {

            return helper.request(url).get('/images')
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect(function (res) {
                    expect(res.body).to.be.an("Array").with.length(0);
                    expect(stubFindImageByQuery).to.have.been.calledOnce;
                });
        });

        it("should put one Images file with using isolocal", function (done) {

            return helper.request(url).put('/images?name=' + testImage.name +
            '&version=' + testImage.version + '&isolocal=' + fakeIsoFile)
                .expect(200)
                .set('Content-Type', 'application/json')
                .end(function (err, res) {
                    var image = res.body;
                    console.log('----------', image, res.body);
                    expect(image.name).should.equal(testImage.name);
                    expect(image.version).should.equal(testImage.version);
                    expect(image.status).should.equal(testImage.status);
                    expect(image.iso).should.equal(testIso.name);
                    expect(stubGetOneImageByNameVersion).to.have.been.calledOnce;
                    expect(stubDownloadIso).to.have.been.calledOnce;
                    expect(stubAddimage).to.have.been.calledOnce;
                    done();
                });
        });

    //     it("should put one Images file with using isolocal", function (done) {
    //
    //         return helper.request(url).put('/images?name=' + testImage.name +
    //         '&version=' + testImage.version + 'isolocal=' + fakeIsoFile)
    //             .send(fs.readFileSync(fakeIsoFile, 'ascii'))
    //             .expect(200)
    //             .end(function (err, res) {
    //                 res.text.should.contain('Upload');
    //                 expect(stubUpload).to.have.been.calledOnce;
    //                 done();
    //             });
    //     });
    //
    //     it("should return one Images files", function () {
    //         return helper.request(url).get('/images')
    //             .set('Content-Type', 'application/json')
    //             .expect(200)
    //             .expect(function (res) {
    //                 expect(res.body).to.be.an("Array").with.length(1);
    //                 expect(stubGetAllImages).to.have.been.calledOnce;
    //                 res.body[0].name.should.equal(testImage.name);
    //                 res.body[0].size.should.equal(testImage.size);
    //             });
    //     });
    //
    //     it("should delete one images", function () {
    //         return helper.request(url).delete('/Images?name=' + testIso.name)
    //             .set('Content-Type', 'application/json')
    //             .expect(200)
    //             .expect(function (res) {
    //                 expect(res.body).to.be.an("object");
    //                 expect(stubDeleteImages).to.have.been.calledOnce;
    //                 res.body.name.should.equal(testImage.name);
    //                 res.body.size.should.equal(testImage.size);
    //             });
    //     });
    });

});

