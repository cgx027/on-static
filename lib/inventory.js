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
    _
) {
    var logger = Logger.initialize("InventoryService");

    var inventoryFilePath = path.resolve(
        configuration.get('inventoryFile', "./inventory.json")
    );

    var imageKeys = ['id', 'name', 'version', 'iso', 'status'];
    var imagesKey = 'images';
    var isoKey = 'iso';

    function isObjectSubset(subObj, fullArray) {
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

    function validateImageObject(image) {
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

    InventoryService.prototype.load = function () {
        if (fs.existsSync(inventoryFilePath)) {

            // console.log('Inventory file loaded:', inventoryFilePath);
            logger.info('Inventory file loaded:' + inventoryFilePath);
            nconf.file("inventory", { 'file': inventoryFilePath });
        } else {
            // console.error('Failed to load Inventory file:', inventoryFilePath);
            logger.error('Failed to load Inventory file:' + inventoryFilePath);
            process.exit(1);
        }
    };

    InventoryService.prototype.get = function get(key) {
        assert.string(key, 'key');
        var value = nconf.get(key);

        if (value === undefined) {
            return [];
        }
        return value;
    };

    InventoryService.prototype.set = function set(key, value) {
        assert.string(key, 'key');
        nconf.set(key, value);
        return this;
    };

    InventoryService.prototype.save = function () {
        var self = this;
        nconf.save(function (err) {
            fs.readFile(inventoryFilePath, function (err, data) {
                logger.info('Inventory saved: ' + data.toString().replace(/[\n\r]+/g, ' '));
            });
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

    InventoryService.prototype.addImage = function addImage(image) {
        assert.ok(validateImageObject(image), 'invalid image')
        var images = this.getAllImages();

        var compareSet = ['name', 'version'];
        var pickImages = pickObjectByProperty(images, compareSet);
        var pickImage = _.pick(image, compareSet);

        if (!isObjectSubset(pickImage, pickImages)) {
            images.push(image);
            this.set(imagesKey, images);
            this.save();
        }
        return images;
    };

    InventoryService.prototype.deleteImageByNameVersion = function addImage(name, version) {
        var query = { "name": name, "version": version };

        var images = this.getAllImages();

        var pickImages = pickObjectByProperty(images, _.keys(query));
        // var pickImage = _.pick(image, compareSet);
        var value = [];

        _.forEach(images, function (image) {
            if (!isObjectSubset(query, pickImages)) {
                value.push(image);
                console.log('poping image', image)
            }
        });

        this.set(imagesKey, value);
        this.save();

        return value;

    };

    InventoryService.prototype.getAllIso = function getAllIso() {
        var value = nconf.get(isoKey);
        return value ? value : [];
    };

    InventoryService.prototype.addIso = function addIso(iso) {
        var isos = this.getAllIso();
        if (!_.has(isos, iso)) {
            isos.push(iso);
            this.set(isoKey, isos);
            this.save();
        }
        return isos;
    };

    InventoryService.prototype.deleteIso = function deleteIso(iso) {
        var isos = this.getAllIso();
        if (!_.has(isos, iso)) {
            isos.pop(iso);
            this.set(isoKey, isos);
            this.save();
        }
        return isos;
    };

    return new InventoryService();
}
