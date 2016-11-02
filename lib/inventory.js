// Copyright 2016, EMC, Inc.

'use strict';

module.exports = InventoryServiceFactory;

InventoryServiceFactory.$provide = 'Services.Inventory';
InventoryServiceFactory.$inject = [
    'assert',
    'Errors',
    'Services.Configuration',
    'Promise',
    'fs',
    'path',
    'Logger',
    'validator',
    'fs-operation',
    'FileUploader',
    'Services.Database',
    '_'
];

function InventoryServiceFactory(
    assert,
    Errors,
    configuration,
    Promise,
    fs,
    path,
    Logger,
    validator,
    fsOp,
    Uploader,
    db,
    _
) {

    var logger = Logger.initialize("InventoryService");


    var imageKeys = ['id', 'name', 'version', 'iso', 'status'];

    function InventoryService() {
        this.initialize();
    }

    InventoryService.prototype.loadConfigAtBoot = function loadConfigAtBoot() {
        var self = this;
        var images = this.getAllImages();

        Promise.each(images, function (image) {
            // return self.setupDir(image, path.join(self.isoDirPath, image.iso));
            return self.setupDir(image, image.iso);
        });

        return;
    };

    InventoryService.prototype.initialize= function () {
        this.isoDirPath = path.join(process.cwd(),
            configuration.get('isoDir', "./static/iso"));
        this.httpFileServiceRootDir = path.join(process.cwd(),
            configuration.get('httpFileServiceRootDir', "./static/files"));

        db.load();

        fsOp.prepareWritableDir(this.isoDirPath);
        fsOp.prepareWritableDir(this.httpFileServiceRootDir);
    };

    InventoryService.prototype.validateImageObject = function validateImageObject(image) {
        if (typeof image !== 'object') {
            return false;
        }

        if (_.difference(imageKeys, _.keys(image)).length !== 0) {
            logger.error('bad image to add');
            return false;
        }

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

    InventoryService.prototype.setupDir = function setupDir(image, isoFile) {
        var mountDir = path.join(this.httpFileServiceRootDir, image.name, image.version);

        return fsOp.unmountIso(mountDir)
            .then(function(){
                return fsOp.mountIso(isoFile, mountDir)
                    .then(function(){
                        return db.updateImageStatus(image.name, image.version, "OK");
                    })
                    .catch(function(err){
                        logger.info(err.message);
                        return db.updateImageStatus(image.name, image.version, "Fail mounting ISO");
                    });
            });
    };

    InventoryService.prototype._getIsoNameFromWebLink =
        function _getIsoNameFromWebLink(source, image) {
            if (source !== 'web') {
                return image.iso;
            } else {
                var link = image.iso;
                if (link.endsWith('.iso')) {
                    var splited = link.split('/');
                    return splited[splited.length - 1];
                } else {
                    return image.name + '-' + image.version;
                }
            }
        };

    InventoryService.prototype.getAllImages = function getAllImages(){
        return db.getAllImages();
    };

    InventoryService.prototype.addImage = function addImage(source, image) {
        var self = this;

        return Promise.try(function(){
            if(! self.validateImageObject(image)) {
                throw new Errors.BadRequestError('Invalid image specified');
            }
        })
            .then(function(){
                return db.findOneImageByNameVersion(image.name, image.version)
                    .catch(function(){
                        throw new Errors.BadRequestError('Image already exists');
                    });
            })
            .then(function(){
                return db.addImage(image);
            })
            .then(function(){
                var iso = image.iso;

                return Promise.try(function(){
                    if (source === 'web' ) {
                        if(validator.isURL(iso)) {
                            var targetIsoFile = self._getIsoNameFromWebLink(source, image);

                            var targetIsoPath = path.join(
                                self.isoDirPath, targetIsoFile
                            );

                            // update iso from web link to store link
                            image.iso = targetIsoPath;

                            return db.updateImageStatus(
                                image.name, image.version,
                                'Downloading iso file')
                                .then(function(){
                                    return fsOp.downloadIso(iso, targetIsoPath)
                                        .catch(function(){
                                            return db.updateImageStatus(
                                                image.name,
                                                image.version,
                                                "Fail downloawding ISO file from web");
                                        });
                                });
                        } else {
                            throw new Errors.BadRequestError('Not a valid web link');
                        }
                    }
                })
                    .then(function(){
                        if(fsOp.checkPathReadable(image.iso)) {
                            return self.setupDir(image, image.iso);
                        } else {
                            throw new Errors.NotFoundError('ISO file not found');
                        }
                    });
            });
    };

    InventoryService.prototype.deleteImageByNameVersion =
        function deleteImageByNameVersion(name, version) {
            var self = this;

            var query = { "name": name, "version": version };
            var image;

            return db.findOneImage(query)
                .then(function(img){
                    image = img;
                    return db.deleteImage(query)
                        .then(function(images){
                            if(_.isEmpty(images)) {
                                throw new Errors.NotFoundError("Image not found");
                            } else {
                                var mountPath = path.join(self.httpFileServiceRootDir,
                                    image.name, image.version);
                                return fsOp.unmountIso(mountPath);
                            }
                        })
                        .then(function(){
                            return Promise.resolve(image);
                        });
                });
        };

    InventoryService.prototype.getAllIso = function getAllIso() {

        function prettifyFileSize(size) {
            if (size > 1000000000) return (size / 1000000000).toFixed(2) + ' GB';
            else if (size > 1000000) return (size / 1000000).toFixed(2) + ' MB';
            else if (size > 1000) return (size / 1000).toFixed(2) + ' KB';
            else return size.toFixed() + ' Byte';
        }

        var filenameList = fs.readdirSync(this.isoDirPath);
        var self = this;

        var value = [];
        _.forEach(filenameList, function (filename) {
            if (filename.endsWith('.iso')) {
                var filePath = path.join(self.isoDirPath, filename);
                var fileStat = fsOp.getFileStat(filePath);
                value.push({
                    'name': filename,
                    'size': prettifyFileSize(fileStat['size']),
                    'uploaded': fileStat['ctime']
                });
            }
        });

        return Promise.resolve(value);
    };

    InventoryService.prototype.deleteIso = function deleteIso(iso) {
        return this.getAllIso()
            .then(function(isos){
                return Promise.try(function(){
                    if (_.some(isos, { name: iso })) {
                        var isoFile = path.join(this.isoDirPath, iso);
                        fsOp.removeFile(isoFile);
                        return this.getAllIso();
                    }
                    else {
                        throw new Errors.NotFoundError('No iso file match query');
                    }
                });
            });
    };


    return new InventoryService();
}
