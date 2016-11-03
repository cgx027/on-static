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
            return self.setupDir(image);
        });

        return;
    };

    InventoryService.prototype.initialize= function () {
        this.isoDirPath = path.join(process.cwd(),
            configuration.get('isoDir', "./static/iso"));
        this.httpFileServiceRootDir = path.join(process.cwd(),
            configuration.get('httpFileServiceRootDir', "./static/files"));

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

    InventoryService.prototype.setupDir = function setupDir(image) {
        var mountDir = path.join(this.httpFileServiceRootDir,
            image.name, image.version);
        var isoFile = path.join(this.isoDirPath, image.iso);

        if(!fsOp.checkPathReadable(isoFile)) {
            throw new Errors.NotFoundError('ISO file not found');
        }

        return fsOp.unmountIso(mountDir)
            .then(function(){
                return fsOp.mountIso(isoFile, mountDir)
                    .then(function(){
                        return db.updateImageStatus(image.name, image.version, "OK");
                    })
                    .catch(function(err){
                        logger.info(err.message);
                        return db.updateImageStatus(image.name, image.version, "Fail mounting ISO")
                            .then(function(){
                                throw new Errors.InternalServerError("Fail mounting ISO");
                            });
                    });
            });
    };

    InventoryService.prototype.getIsoNameFromStr =
        function getIsoNameFromStr(str) {
            if (str.endsWith('.iso')) {
                var splited = str.split('/');
                return splited[splited.length - 1];
            } else {
                return '';
            }
        };

    InventoryService.prototype.getIsoNameFromPath =
        function getIsoNameFromPath(pathStr) {
            var iso = this.getIsoNameFromStr(pathStr);
            if (!iso) {
                return iso;
            } else {
                throw new Errors.BadRequestError('ISO path should end with .iso');
            }
        };

    InventoryService.prototype.getIsoNameFromWebLink =
        function getIsoNameFromWebLink(osName, osVersion, link) {
            var iso = this.getIsoNameFromStr(link);
            return iso? iso: osName + '-' + osVersion;
        };

    InventoryService.prototype.downloadIso = function downloadIso(image, link){
        if(validator.isURL(link)) {

            var targetIsoPath = path.join(this.isoDirPath, image.iso);

            return db.updateImageStatus(image.name, image.version,
                'Downloading iso file')
                .then(function(){
                    return fsOp.downloadIso(link, targetIsoPath)
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
    };

    InventoryService.prototype.getAllImages = function getAllImages(){
        return db.getAllImages();
    };

    InventoryService.prototype.getOneImageByNameVersion =
        function getOneImageByNameVersion(name, version){
        return db.findOneImageByNameVersion(name, version);
    };

    InventoryService.prototype.addImage = function addImage(image) {
        var self = this;

        return Promise.try(function(){
            if(! self.validateImageObject(image)) {
                throw new Errors.BadRequestError('Invalid image parameters specified');
            }
        })
            .then(function(){
                return db.addImage(image);
            })
            .then(function(){
                return self.setupDir(image);
            });
    };

    InventoryService.prototype.deleteImageByNameVersion =
        function deleteImageByNameVersion(name, version) {
            var self = this;

            var query = { "name": name, "version": version };

            var mountPath = path.join(self.httpFileServiceRootDir,
                name, version);

            var image;

            return db.findOneImage(query)
                .then(function(img){
                    image = img;
                    return db.deleteImage(query)
                        .then(function(images){
                            if(_.isEmpty(images)) {
                                throw new Errors.NotFoundError("Image not found");
                            }
                            return fsOp.unmountIso(mountPath);
                        })
                        .then(function(){
                            fsOp.removeDir(mountPath);
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
        var self =this;
        return this.getAllIso()
            .then(function(isos){
                return Promise.try(function(){
                    if (_.some(isos, { name: iso })) {
                        var isoFile = path.join(self.isoDirPath, iso);
                        fsOp.removeFile(isoFile);
                        return self.getAllIso();
                    }
                    else {
                        throw new Errors.NotFoundError('No iso file match query');
                    }
                });
            });
    };


    return new InventoryService();
}
