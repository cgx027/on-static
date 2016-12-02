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
    DataBase,
    _
) {

    var logger = Logger.initialize("InventoryService");
    var db;

    var imageKeys = ['id', 'name', 'version', 'iso', 'status'];

    function prettifyFileSize(size) {
        if (size > 1000000000) return (size / 1000000000).toFixed(2) + ' GB';
        else if (size > 1000000) return (size / 1000000).toFixed(2) + ' MB';
        else if (size > 1000) return (size / 1000).toFixed(2) + ' KB';
        else return size.toFixed() + ' Byte';
    }

    function constructFileObject(link){
        var filename = fsOp.getFileNameFromStr(link);
        var fileStat = fsOp.getFileStat(link);
        return {
            'name': filename,
            'size': prettifyFileSize(fileStat['size']),
            'uploaded': fileStat['ctime']
        };
    }

    function InventoryService() {
    }

    InventoryService.prototype.loadConfigAtBoot = function loadConfigAtBoot() {
        var self = this;
        return this.findImagesByQuery()
            .then(function(images){
                logger.info('Loading images from inventory');
                return Promise.each(images, function (image) {
                    if(image.status === 'OK') {
                        logger.info('Loading ' + image.name + ' ' + image.version);
                        return self.setupDir(image)
                            .catch(function(){
                                db.deleteImage(image);
                            });
                    } else {
                        logger.info('Remove bad image ' + image.name + ' ' + image.version);
                        return db.deleteImage(image);
                    }
                });
            });
    };

    InventoryService.prototype.initialize= function initialize() {
        db = new DataBase(),
        db.load(),
        this.isoDirPath = path.join(process.cwd(),
            configuration.get('isoDir', "./static/iso"));
        this.httpFileServiceRootDir = path.join(process.cwd(),
            configuration.get('httpFileServiceRootDir', "./static/files"));
        this.microkernelDirPath = path.join(process.cwd(),
            configuration.get('microkernelDir', "./static/common"));

        fsOp.prepareWritableDir(this.isoDirPath);
        fsOp.prepareWritableDir(this.microkernelDirPath);
        fsOp.prepareWritableDir(this.httpFileServiceRootDir);
    };

    InventoryService.prototype.validateImageObject = function validateImageObject(image) {
        if (typeof image !== 'object') {
            return false;
        }

        if (_.difference(imageKeys, _.keys(image)).length !== 0) {
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

        return Promise.try(function(){
            if(!fsOp.checkPathReadable(isoFile)) {
                var failMessage = "error: ISO file not found";
                throw new Errors.NotFoundError(failMessage);
            }

            return fsOp.mountIso(isoFile, mountDir)
                .catch(function(){
                    var failMessage = "error: Fail mounting ISO";
                    logger.info(failMessage);
                    throw new Errors.InternalServerError(failMessage);
                });
        });
    };

    InventoryService.prototype.downloadIso = function downloadIso(image, link){
        if(validator.isURL(link)) {

            var targetIsoPath = path.join(this.isoDirPath, image.iso);

            return fsOp.downloadIso(link, targetIsoPath)
                .then(function(){
                    if(fsOp.getFileSize(targetIsoPath) === 0){
                        throw new Error('Error downloading ISO file');
                    }
                })
                .catch(function(){
                    return fsOp.removeFile(targetIsoPath)
                        .finally(function(){
                            throw new Errors.BadRequestError('Error downloading ISO file');
                        });
                });
        } else {
            throw new Errors.BadRequestError('Not a valid web link');
        }
    };

    InventoryService.prototype.findImagesByQuery = function findImagesByQuery(query){
        return db.findImagesByQuery(query);
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
                return self.setupDir(image);
            })
            .then(function(){
                logger.info('Image ' + image.name + ' ' + image.version + ' added');
                return db.addImage(image);
            });
    };

    InventoryService.prototype.deleteImageByQuery = function deleteImageByQuery(query) {
        var self = this;

        return db.findImagesByQuery(query)
            .then(function(images){
                if(_.isEmpty(images)) {
                    throw new Errors.NotFoundError("No image matching query");
                }

                return Promise.each(images, function(image){
                    var mountPath = path.join(self.httpFileServiceRootDir,
                        image.name, image.version);

                    logger.info('Removing ' + image.name + ' ' + image.version);

                    return fsOp.unmountIso(mountPath)
                        .catch(function(){
                            throw new Errors.InternalServerError('Error umount iso');
                        })
                        .then(function(){
                            return db.deleteImage(image);
                        })
                        .then(function(){
                            fsOp.removeDirAndEmptyParent(mountPath);
                            logger.info('Image ' + image.name + ' ' + image.version + ' removed');
                            return image;
                        });
                })
                    .then(function(images){
                        return images;
                    });
            });
    };

    InventoryService.prototype.getFiles = function getFiles(link) {

        var filenameList = fs.readdirSync(link);

        var value = [];
        _.forEach(filenameList, function (filename) {
            value.push(constructFileObject(
                path.join(link, filename)
            ));
        });

        return Promise.resolve(value);
    };

    InventoryService.prototype.getAllIso = function getAllIso() {
        return this.getFiles(this.isoDirPath)
            .then(function(isoFiles){
                return _.filter(isoFiles, function(iso){
                    return iso.name.endsWith('.iso');
                });
            });
    };

    InventoryService.prototype.deleteFiles = function deleteFiles(link) {
        var self =this;

        return Promise.try(function(){
            if(!fs.existsSync(link)){
                throw new Errors.NotFoundError('No file match query');
            }

            var returnFileObj = constructFileObject(link);

            return fsOp.removeFile(link)
                .catch(function(err){
                    logger.info(JSON.stringify(err.message));
                    throw new Errors.InternalServerError('Fail deleting file');
                })
                .then(function(){
                    return returnFileObj;
                });

        });
    };

    InventoryService.prototype.deleteIso = function deleteIso(iso) {
        return this.deleteFiles(
            path.join(this.isoDirPath, iso)
        );
    };

    InventoryService.prototype.getAllMicrokernel = function getAllMicrokernel() {
        return this.getFiles(this.microkernelDirPath);
    };

    InventoryService.prototype.deleteMicrokernel = function deleteMicrokernel(microkernel) {
        return this.deleteFiles(
            path.join(this.microkernelDirPath, microkernel)
        );
    };

    return InventoryService;
}

