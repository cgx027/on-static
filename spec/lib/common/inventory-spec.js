// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe('inventory service', function () {
    var path = helper.injector.get('path');
    var fs = helper.injector.get('fs');
    var fsOp = helper.injector.get('Fs.Operation');
    var Errors = helper.injector.get('Errors');
    var _ = helper.injector.get('_');
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
    var fakeInventorySrcAbs = path.join(cwd, './spec/data/inventory_db_test.json');

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
    var testImage = allImages[1];

    before('setup config', function () {
        setupConfig();
        prepareTestInventoryFile();
        copyTestIsoToStore();

        inventory = helper.injector.get('Services.Inventory');
        db = helper.injector.get('Services.Database');
    });

    after('restore config', function () {
        sandbox.restore();
        restoreConfig();
    });

    function copyTestIsoToStore() {
        return fs.createReadStream(fakeIsoFile)
            .pipe(fs.createWriteStream(path.join(fakeIsoDir, '/test.iso'))) ;
    }

    function prepareTestInventoryFile() {
        fs.writeFileSync(fakeInventoryFileAbs, '');

        return fs.createReadStream(fakeInventorySrcAbs)
            .pipe(fs.createWriteStream(fakeInventoryFileAbs));
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

        it("should load config", function () {
            sandbox.spy(inventory, 'loadConfigAtBoot');
            sandbox.spy(inventory, 'findImagesByQuery');
            sandbox.stub(inventory, 'setupDir').resolves({});

            return inventory.loadConfigAtBoot()
                .then(function(imageList){
                    expect(inventory.findImagesByQuery).to.have.been.calledOnce;
                    expect(inventory.setupDir).to.have.been.calledTwice;
                });
        });

        it("should remove image with status that is not OK", function () {
            inventory.findImagesByQuery.restore();
            sandbox.stub(inventory, 'findImagesByQuery').resolves([
                {
                    "id": "b6b3e3be-c799-4af4-86c8-09a99d3aa7c7",
                    "iso": "centos-7.0.iso",
                    "name": "centos",
                    "version": "7.0",
                    "status": "FAILED"
                }
            ]);
            sandbox.spy(db, 'deleteImage');

            return inventory.loadConfigAtBoot()
                .then(function(){
                    expect(db.deleteImage).to.have.been.calledOnce;
                });
        });

        it("should remove image that failed setupDir", function () {
            inventory.findImagesByQuery.restore();
            sandbox.stub(inventory, 'findImagesByQuery').resolves([
                {
                    "id": "b6b3e3be-c799-4af4-86c8-09a99d3aa7c7",
                    "iso": "centos-7.0.iso",
                    "name": "centos",
                    "version": "7.0",
                    "status": "OK"
                }
            ]);
            db.deleteImage.restore();
            sandbox.spy(db, 'deleteImage');

            inventory.setupDir.restore();
            sandbox.stub(inventory, 'setupDir').rejects({});

            return inventory.loadConfigAtBoot()
                .then(function(imageList){
                    expect(db.deleteImage).to.have.been.calledOnce;
                });
        });

        it("should add Image", function () {

            inventory.setupDir.restore();
            sandbox.stub(inventory, 'setupDir').resolves(testImage);
            sandbox.stub(db, 'addImage').resolves(testImage);

            return inventory.addImage(testImage)
                .then(function(image){
                    expect(image).to.equal(testImage);
                });
        });

        it("should not add malformed image", function () {

            sandbox.stub(inventory, 'validateImageObject').returns(false);

            return inventory.addImage(testImage).should.be.rejectedWith(Errors.BadRequestError);
        });

        it("should delete file", function () {

            sandbox.stub(fsOp, 'removeFile').resolves({});

            return inventory.deleteFiles(fakeIsoFile)
                .then(function(fileObj){
                    expect(fileObj.name).to.equal('fake.iso');
                    expect(fileObj.size).to.equal('360.45 KB');
                });
        });

        it("should throw error when file does not exists", function () {

            sandbox.stub(fs, 'existsSync').returns(false);

            return inventory.deleteFiles('this_is_not_a_valid_link')
                .should.be.rejectedWith(Errors.NotFoundError);
        });

        it("should throw error when fail delete file", function () {

            fs.existsSync.restore();
            fsOp.removeFile.restore();
            sandbox.stub(fsOp, 'removeFile').rejects({message: ''});

            return inventory.deleteFiles(fakeIsoFile)
                .should.be.rejectedWith(Errors.InternalServerError);
        });

        it("should delete image by query", function () {

            sandbox.stub(db, 'findImagesByQuery').resolves([testImage]);
            sandbox.stub(fsOp, 'unmountIso').resolves({});
            sandbox.stub(fsOp, 'removeDirAndEmptyParentSync').returns();
            db.deleteImage.restore();
            sandbox.stub(db, 'deleteImage').resolves({});

            return inventory.deleteImageByQuery({name: 'centos', version: '8.0'})
                .then(function(image){
                    expect(image).to.deep.equal([testImage]);
                });
        });

        it("should not delete image when nothing match query", function () {

            db.findImagesByQuery.restore();
            sandbox.stub(db, 'findImagesByQuery').resolves([]);

            return inventory.deleteImageByQuery({name: 'centos', version: '8.0'})
                .should.be.rejectedWith(Errors.NotFoundError);
        });

        it("should not delete image when fail to unmount iso", function () {

            db.findImagesByQuery.restore();
            sandbox.stub(db, 'findImagesByQuery').resolves([testImage]);

            fsOp.unmountIso.restore();
            sandbox.stub(fsOp, 'unmountIso').rejects({});


            return inventory.deleteImageByQuery({name: 'centos', version: '8.0'})
                .should.be.rejectedWith(Errors.InternalServerError);
        });

        it("should download iso", function () {

            sandbox.stub(fsOp, 'downloadIso').resolves({});
            sandbox.stub(fsOp, 'getFileSizeSync').resolves(1000);

            return inventory.downloadIso(testImage, 'http://fake-site.com/test.iso')
                .should.be.resolved;
        });

        it("should fail download iso with invalid url", function () {

            return inventory.downloadIso(testImage, 'this-is-not-a-valid-web-lik')
                .should.be.rejectedWith(Errors.BadRequestError);
        });

        it("should fail download iso with zero file size", function () {

            fsOp.getFileSizeSync.restore();
            sandbox.stub(fsOp, 'getFileSizeSync').returns(0);

            fsOp.downloadIso.restore();
            sandbox.stub(fsOp, 'downloadIso').resolves({});

            return inventory.downloadIso(testImage, 'http://fake-site.com/test.iso')
                .should.be.rejectedWith(Errors.BadRequestError);
        });

        it("should fail download", function () {

            fsOp.getFileSizeSync.restore();
            sandbox.stub(fsOp, 'getFileSizeSync').returns(1000);

            fsOp.downloadIso.restore();
            sandbox.stub(fsOp, 'downloadIso').rejects({});

            return inventory.downloadIso(testImage, 'http://fake-site.com/test.iso')
                .should.be.rejectedWith(Errors.BadRequestError);
        });

        it("should fail download with iso file removed", function () {

            fsOp.getFileSizeSync.restore();
            sandbox.stub(fsOp, 'getFileSizeSync').returns(1000);

            fsOp.downloadIso.restore();
            sandbox.stub(fsOp, 'downloadIso').rejects({});

            fsOp.removeFile.restore();
            sandbox.spy(fsOp, 'removeFile');

            return inventory.downloadIso(testImage, 'http://fake-site.com/test.iso')
                .should.be.rejectedWith(Errors.BadRequestError)
                .then(function(){
                    fsOp.removeFile.should.be.called;
                });
        });

        it("should findImagesByQuery", function () {

            db.findImagesByQuery.restore();
            sandbox.stub(db, 'findImagesByQuery').resolves({});

            inventory.findImagesByQuery.restore();

            return inventory.findImagesByQuery()
                .then(function(){
                    db.findImagesByQuery.should.be.calledOnce;
                });
        });

        it("should getOneImageByNameVersion", function () {

            sandbox.stub(db, 'findOneImageByNameVersion').resolves({});

            return inventory.getOneImageByNameVersion()
                .then(function(){
                    db.findOneImageByNameVersion.should.be.calledOnce;
                });
        });

        it("should validateImageObject", function () {
            inventory.validateImageObject.restore();

            inventory.validateImageObject(testImage).should.equal(true);
        });

        it("should fail image validate if non-object is passed in", function () {
            inventory.validateImageObject('I am a string').should.equal(false);
        });

        it("should fail image validate if invalid key is passed in", function () {
            var invalidImage = _.cloneDeep(testImage);
            invalidImage.invalidKey = '';

            inventory.validateImageObject(invalidImage).should.equal(false);
        });

        it("should fail image validate if invalid key is passed in", function () {
            var invalidImage = _.cloneDeep(testImage);
            invalidImage.name = '';

            inventory.validateImageObject(invalidImage).should.equal(false);
        });

        it("should fail image validate if image ID is not UUID", function () {
            var invalidImage = _.cloneDeep(testImage);
            invalidImage.id = 'I-am-not-a-valid-id';

            inventory.validateImageObject(invalidImage).should.equal(false);
        });

        it("should setup dir", function () {

            sandbox.stub(fsOp, 'checkPathReadableSync').returns(true);

            sandbox.stub(fsOp, 'mountIso').resolves({});

            inventory.setupDir.restore();

            return inventory.setupDir(testImage)
                .should.be.resolved;
        });

        it("should not setup dir if path not readable", function () {

            fsOp.checkPathReadableSync.restore();
            sandbox.stub(fsOp, 'checkPathReadableSync').returns(false);

            fsOp.mountIso.restore();
            sandbox.stub(fsOp, 'mountIso').resolves({});

            return inventory.setupDir(testImage)
                .should.be.rejectedWith(Errors.NotFoundError);
        });

        it("should not setup dir if fail mount ISO", function () {

            fsOp.checkPathReadableSync.restore();
            sandbox.stub(fsOp, 'checkPathReadableSync').returns(true);

            fsOp.mountIso.restore();
            sandbox.stub(fsOp, 'mountIso').rejects({});

            return inventory.setupDir(testImage)
                .should.be.rejectedWith(Errors.InternalServerError);
        });
    });
});

