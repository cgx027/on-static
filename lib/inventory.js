// Copyright 2016, EMC, Inc.

'use strict';

module.exports = InventoryServiceFactory;

InventoryServiceFactory.$provide = 'Services.Inventory';
InventoryServiceFactory.$inject = [
    'assert',
    'Services.Configuration',
    'nconf',
    'Promise',
    'fs',
    'path',
    'Logger',
    'validator',
    'fs-operation',
    'FileUploader',
    '_'
];

function InventoryServiceFactory(
    assert,
    configuration,
    nconf,
    Promise,
    fs,
    path,
    Logger,
    validator,
    fsOp,
    Uploader,
    _
) {
    var osTreeMapper = {
        ubuntu: "./",
        photon: "./",
        rhel: "./",
        centos: "./"
    };

    var logger = Logger.initialize("InventoryService");

    var inventoryFilePath = path.join(process.cwd(),
        configuration.get('inventoryFile', "../config.json")
    );

    var isoDirPath = path.join(process.cwd(),
        configuration.get('isoDir', "./static/iso")
    );

    var httpFileServiceRootDir = path.join(process.cwd(),
        configuration.get('httpFileServiceRootDir', "./static/files")
    );

    var mountPath = path.join(httpFileServiceRootDir, 'mount');

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

    function validateImageObject(image) {
        if (typeof image !== 'object') {
            return false;
        }

        if (_.difference(imageKeys, _.keys(image)).length !== 0) {
            logger.error('bad image to add');
            return false;
        }

        var osName = image.name.toLowerCase();
        var supportedOs = _.keys(osTreeMapper);

        if (!_.includes(supportedOs, osName)) {
            throw new Error('not supported OS type, should be on of ' + supportedOs.toString())
        }

        var ret = true;

        _.forEach(imageKeys, function (key) {
            if (!image[key]) {
                logger.error(key + 'can not be empty value');
                ret = false;
            }
            else if (key === 'id' && !validator.isUUID(image[key])) {
                logger.error('bad image to add, wrong id format');
                ret = false
            }
        })

        return ret;
    }

    function pickObjectByProperty(arrayOfObjects, arrayOfProperty) {
        return _.map(arrayOfObjects, function (object) {
            return _.pick(object, arrayOfProperty);
        })
    }

    function InventoryService() {
        this.load();
    }

    InventoryService.prototype.loadConfigAtBoot = function loadConfigAtBoot() {
        var self = this;
        var images = this.getAllImages();

        _.forEach(images, function (image) {
            self.setupImageDir(image, path.join(isoDirPath, image.iso));
        })

        return;
    };

    InventoryService.prototype.load = function () {
        if (fs.existsSync(inventoryFilePath)) {
            logger.info('Inventory file loaded:' + inventoryFilePath);
            nconf.file("file", { 'file': inventoryFilePath });
        } else {
            logger.error('Failed to load Inventory file:' + inventoryFilePath);
            process.exit(1);
        }

        fsOp.prepareWritableDir(isoDirPath);
        fsOp.prepareWritableDir(httpFileServiceRootDir);
        fsOp.prepareWritableDir(mountPath);
    };

    InventoryService.prototype.get = function get(key) {
        assert.string(key, 'key');
        var value = nconf.get(key);

        if (value === undefined) {
            return [];
        }
        return value;
    };

    // InventoryService.prototype.set = function set(key, value) {
    //     assert.string(key, 'key');
    //     nconf.set(key, value);
    //     return this;
    // };

    InventoryService.prototype.set = configuration.set;

    InventoryService.prototype.save = function () {
        var self = this;
        nconf.save(function (err) {
            // fs.readFile(inventoryFilePath, function (err, data) {
            //     logger.info('Inventory saved: ' + data.toString().replace(/[\n\r]+/g, ' '));
            // });
        });
    };

    InventoryService.prototype.getAllImages = function getAllImages() {
        var value = this.get(imagesKey);
        return value ? value : [];
    };

    InventoryService.prototype.getImageByQuery = function getImageByQuery(query) {
        var images = this.getAllImages();
        var result = [];
        var queryKeys = _.keys(query)

        _.forEach(images, function (image) {
            var pick = _.pick(image, queryKeys);
            if (_.isEqual(pick, query)) {
                result.push(image);
            }
        })

        return result;
    };

    InventoryService.prototype.getImageById = function getImageById(id) {
        return this.getImageByQuery({ "id": id });
    };

    InventoryService.prototype.getImageByNameVersion = function getImageByNameVersion(
        name,
        version
    ) {
        return this.getImageByQuery({ "name": name, "version": version });
    };

    InventoryService.prototype.getOneImageByNameVersion = function getOneImageByNameVersion(
        name,
        version
    ) {
        assert.string(name, 'OS name');
        assert.string(version, 'OS version');

        var images = this.getImageByNameVersion(name, version);
        if (images.length > 0) return images[0];
        else return {};
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
        })
        this.set(imagesKey, images);
        this.save();
    }

    InventoryService.prototype.setupImageDir = function setupImageDir(image, isoFile) {
        var self = this;
        var symbolLinkDir = path.join(httpFileServiceRootDir, image.name, image.version);
        var mountDir = path.join(mountPath, image.name, image.version);

        // unmount incase the iso has already been mounted.
        fsOp.unmountIso(mountDir, function () {
            fsOp.mountIso(isoFile, mountDir, function (err) {
                if (err) {
                    self.failImageByNameVersion(image.name, image.version, 'mounting iso');
                } else {
                    var source = path.join(mountDir, osTreeMapper[image.name])

                    // remvoe the symbol link before create one
                    fsOp.removeFile(symbolLinkDir);

                    fsOp.createSymbolLink(
                        source,
                        symbolLinkDir,
                        function (err) {
                            if (err) {
                                fsOp.unmountIso(mountDir);
                                self.failImageByNameVersion(image.name, image.version, 'creating symbol link');
                            } else {
                                self.updateImageStatus(image.name, image.version, 'OK');
                                logger.info('Done setting up image for ' + image.name + ' ' + image.version);
                            }
                        });
                }

            });
        })
    }

    InventoryService.prototype.addImage = function addImage(source, image) {
        assert.ok(validateImageObject(image), 'invalid image')
        var self = this;

        var nameVersionStr = image.name + '-' + image.version;

        var images = this.getAllImages();

        var compareSet = ['name', 'version'];
        var pickImages = pickObjectByProperty(images, compareSet);
        var pickImage = _.pick(image, compareSet);

        // if (isObjectSubsetOfArray(pickImage, pickImages)) {
        //     throw new Error('image already exists');
        // }

        var iso = image.iso;
        //  Ensure the image exists and is readable
        if (source == 'local' && fsOp.checkPathReadable(iso)) {
            this.setupImageDir(image, iso);
        } else if ((source == 'store' || source == 'client') &&
            fsOp.checkPathReadable(path.join(isoDirPath, iso))) {
            // try using iso file that is already downloaded to iso directory
            this.setupImageDir(image, path.join(isoDirPath, iso));
        } else if (source == 'web' && validator.isURL(iso)) {
            var targeIsoFile;
            if (iso.endsWith('.iso')) {
                // get iso file name from http link
                var splited = iso.split('/');
                targeIsoFile = splited[splited.length - 1];
                console.log(splited, targeIsoFile)
            } else {
                targeIsoFile = path.join(isoDirPath, nameVersionStr + '.iso');
            }
            // download iso
            fsOp.downloadIso(iso, targeIsoFile, function (err) {
                if (err) {
                    // remove downloaded file in case of rror
                    fsOp.removeFile(targeIsoFile)
                    self.failImageByNameVersion(image.name, image.version, 'downloading iso');
                } else {
                    self.setupImageDir(image, targeIsoFile);
                }
            });
            
            // update iso from web link to store link
            image.iso = targeIsoFile;
            image.status = 'downloading iso'
        } else {
            throw new Error('invalid iso path specified, should be a http url or local path.');
        }

        console.log(image)
        images.push(image);
        self.set(imagesKey, images);
        self.save();
        return images;
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
                var mountDir = path.join(mountPath, image.name, image.version);
                var symbolLinkDir = path.join(httpFileServiceRootDir, image.name, image.version);

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

    InventoryService.prototype.failImageByNameVersion = function failImageByNameVersion(name, version, message) {
        var msg = message ? ': ' + message : '';

        this.updateImageStatus(name, version, 'failed' + msg);
    };

    InventoryService.prototype.getAllIso = function getAllIso() {
        var sizeStr;

        function prettifyFileSize(size) {
            if (size > 1000000000) return (size / 1000000000).toFixed(2) + ' GB';
            else if (size > 1000000) return (size / 1000000).toFixed(2) + ' MB';
            else if (size > 1000) return (size / 1000).toFixed(2) + ' KB';
            else return size.toFixed() + ' Byte';
        }

        var filenameList = fs.readdirSync(isoDirPath);

        var value = [];
        _.forEach(filenameList, function (filename) {
            if (filename.endsWith('.iso')) {
                var filePath = path.join(isoDirPath, filename);
                var fileStat = fsOp.getFileStat(filePath);
                value.push({
                    'name': filename,
                    'size': prettifyFileSize(fileStat['size']),
                    'upload': fileStat['ctime']
                });
            }
        });

        return value;
    };


    InventoryService.prototype.deleteIso = function deleteIso(iso) {
        var isos = this.getAllIso();
        if (_.some(isos, { name: iso })) {
            var isoFile = path.join(isoDirPath, iso)
            fsOp.removeFile(isoFile);
        }
        else {
            throw new Error('no iso file match query');
        }
        return this.getAllIso();
    };

    return new InventoryService();
}
