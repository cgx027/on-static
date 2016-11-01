// Copyright 2016, EMC, Inc.

'use strict';

module.exports = InventoryServiceFactory;

InventoryServiceFactory.$provide = 'Services.Inventory';
InventoryServiceFactory.$inject = [
    'assert',
    'Services.Configuration',
    'Promise',
    'fs',
    'path',
    'Logger',
    'validator',
    'fs-operation',
    'FileUploader',
    'Service.Database',
    '_'
];

function InventoryServiceFactory(
    assert,
    configuration,
    Promise,
    fs,
    path,
    Logger,
    validator,
    fsOp,
    db,
    Uploader,
    _
) {

    var logger = Logger.initialize("InventoryService");


    var imageKeys = ['id', 'name', 'version', 'iso', 'status'];
    var imagesKey = 'images';

    function isObjectSubsetOfArray(subObj, fullArray) {
        assert.object(subObj, 'sub');
        assert.object(fullArray, 'full');

        var keySub = _.keys(subObj);

        var pick = pickObjectByProperty(fullArray, keySub);

        if (_.some(pick, subObj)) {
            return true;
        }
        else {
            return false;
        }

    }

    function isObjectSubset(subObj, obj) {
        assert.object(subObj, 'sub');
        assert.object(obj, 'full');

        var keySub = _.keys(subObj);

        var pick = _.pick(obj, keySub);

        if (_.isEqual(pick, subObj)) {
            return true;
        }
        else {
            return false;
        }

    }


    function pickObjectByProperty(arrayOfObjects, arrayOfProperty) {
        return _.map(arrayOfObjects, function (object) {
            return _.pick(object, arrayOfProperty);
        });
    }

    function InventoryService() {
        this.initialize();
    }

    InventoryService.prototype.loadConfigAtBoot = function loadConfigAtBoot() {
        var self = this;
        var images = this.getAllImages();

        _.forEach(images, function (image) {
            self.setupImageDir(image, path.join(this.isoDirPath, image.iso));
        });

        return;
    };

    InventoryService.prototype.initialize= function () {
        this.isoDirPath = path.join(process.cwd(),
            configuration.get('isoDir', "./static/iso"));
        this.httpFileServiceRootDir = path.join(process.cwd(),
            configuration.get('httpFileServiceRootDir', "./static/files"));
        this.mountPath = path.join(this.httpFileServiceRootDir, 'mount');

        db.load();

        fsOp.prepareWritableDir(this.isoDirPath);
        fsOp.prepareWritableDir(this.httpFileServiceRootDir);
        fsOp.prepareWritableDir(this.mountPath);
    };

    InventoryService.prototype.validateImageObject = function validateImageObject(image) {
        if (typeof image !== 'object') {
            return false;
        }

        if (_.difference(imageKeys, _.keys(image)).length !== 0) {
            logger.error('bad image to add');
            return false;
        }

        // var osName = image.name.toLowerCase();
        // var supportedOs = _.keys(osTreeMapper);
        //
        // if (!_.includes(supportedOs, osName)) {
        //     throw new Error('not supported OS type, should be on of ' + supportedOs.toString());
        // }

        var ret = true;

        _.forEach(imageKeys, function (key) {
            if (!image[key]) {
                logger.error(key + 'can not be empty value');
                ret = false;
            }
            else if (key === 'id' && !validator.isUUID(image[key])) {
                logger.error('bad image to add, wrong id format');
                ret = false;
            }
        });

        return ret;
    };

    InventoryService.prototype.updateImageStatus = function updateImageStatus(
        name,
        version,
        status) {

            assert.string(status, 'status');

            var images = this.getAllImages();

            _.forEach(images, function (image, index) {
                if (image.name === name && image.version === version) {
                    images[index].status = status;
                }
            });
            this.set(imagesKey, images);
            this.save();
    };

    InventoryService.prototype.setupDir = function setupDir(image, isoFile) {
        var mountDir = path.join(this.httpFileServiceRootDir, image.name, image.version);

        return fsOp.unmountIso(mountDir)
            .then(function(){
                return fsOp.mountIso(isoFile, mountDir)
                    .then(function(){
                        db.updateImageStatus(image.name, image.version, "OK");
                    })
                    .catch(function(){
                        db.updateImageStatus(image.name, image.version, "Fail Mouting ISO");
                    });
            }) .catch(function(){
                // ignore unmount errors
                return;
            });
    };

    InventoryService.prototype.downloadIso = function downloadIso(source, image) {
    };

    InventoryService.prototype._getIsoNameFromWebLink = function getIsoNameFromWebLink(link) {
        if (link.endsWith('.iso')) {
            // get iso file name from http link
            var splited = link.split('/');
            return splited[splited.length - 1];
        } else {
            return;
        }
    };

    InventoryService.prototype.addImage = function addImage(source, image) {
        var self = this;

        return Promise.try(function(){
            assert.ok(this.validateImageObject(image), 'invalid image specified');
        })
            .then(function(){
                return db.findOneImageByNameVersion(image.name, image.version)
                    .cathe(function(){
                        throw new Error('image already exists');
                    });
            })
            .then(function(){
                var iso = image.iso;

                if (source === 'local' || source === 'store' || source === 'client')  {
                    return Promise.try(function(){
                        if(fsOp.checkPathReadable(iso)) {
                            return this.setupDir(image, iso);
                        } else {
                            throw new Error('ISO file not found');
                        }
                    });
                } else if (source === 'web' ) {
                    return Promise.try(function(){
                        if(validator.isURL(iso)) {
                            var fileName= this.getIsoNameFromWebLink(iso);

                            var targetIsoFile =
                                fileName? fileName: image.name + '-' + image.version;

                            // update iso from web link to store link
                            image.iso = targetIsoFile;

                            var targetIsoPath = path.join(
                                this.isoDirPath, targetIsoFile
                            );
                            // download iso
                            return fsOp.downloadIso(iso, targetIsoPath)
                                .then(function(){
                                    return self.setupDir(image, targetIsoPath)
                                        .catch(function(){
                                            return db.updateImageStatus(
                                                image.name,
                                                image.version
                                                "Fail downloawding ISO file from web");
                                        })
                                })
                                .then(function(){
                                    return db.updateImageStatus(
                                        image.name, image.version,
                                        'downloading iso file');
                                })
                        } else {
                            throw new Error('not a valid web link')
                        }
                    })
                } else {
                    throw new Error("invalid iso path specified, "
                        + "should be a http url or local path.");
                    }
            })
            .then(function(){
                return db.addImage(image);
            })
    };

    InventoryService.prototype.deleteImageByNameVersion = function deleteImageByNameVersion(name, version) {
        var query = { "name": name, "version": version };

        var images = this.getAllImages();

        var rtn = [];
        var isMatch = false;

        if (!images) throw new Error('Image not found');

        _.forEach(images, function (image) {
            if (!isObjectSubset(query, image)) {
                rtn.push(image);
            } else {
                isMatch = true;
                var mountDir = path.join(this.mountPath, image.name, image.version);
                var symbolLinkDir = path.join(this.httpFileServiceRootDir, image.name, image.version);

                fsOp.unmountIso(mountDir, function () {
                    fsOp.removeFile(symbolLinkDir);
                });
            }
        });

        if (!isMatch) throw new Error('no image found match the query');

        this.set(imagesKey, rtn);
        this.save();

        return rtn;

    };

    InventoryService.prototype.getAllIso = function getAllIso() {
        var sizeStr;

        function prettifyFileSize(size) {
            if (size > 1000000000) return (size / 1000000000).toFixed(2) + ' GB';
            else if (size > 1000000) return (size / 1000000).toFixed(2) + ' MB';
            else if (size > 1000) return (size / 1000).toFixed(2) + ' KB';
            else return size.toFixed() + ' Byte';
        }

        var filenameList = fs.readdirSync(this.isoDirPath);

        var value = [];
        _.forEach(filenameList, function (filename) {
            if (filename.endsWith('.iso')) {
                var filePath = path.join(this.isoDirPath, filename);
                var fileStat = fsOp.getFileStat(filePath);
                value.push({
                    'name': filename,
                    'size': prettifyFileSize(fileStat['size']),
                    'uploaded': fileStat['ctime']
                });
            }
        });

        return value;
    };


    InventoryService.prototype.deleteIso = function deleteIso(iso) {
        var isos = this.getAllIso();
        if (_.some(isos, { name: iso })) {
            var isoFile = path.join(this.isoDirPath, iso);
            fsOp.removeFile(isoFile);
        }
        else {
            throw new Error('no iso file match query');
        }
        return this.getAllIso();
    };

    return new InventoryService();
}
