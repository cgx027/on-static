// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express');

module.exports = internalApiFactory;

di.annotate(internalApiFactory, new di.Provide('northbound-api'));
di.annotate(internalApiFactory, new di.Inject(
    di.Injector,
    'assert',
    'Services.Inventory',
    'fs',
    'path',
    'Logger',
    'FileUploader',
    'Services.Configuration',
    'uuid',
    '_'
)
);

function internalApiFactory(
    injector,
    assert,
    inventory,
    fs,
    path,
    Logger,
    Uploader,
    configuration,
    uuid,
    _) {
    var router = express.Router();

    var logger = Logger.initialize("northboundApi");
    var isoDirPath = path.join(process.cwd(),
        configuration.get('isoDir', "./static/iso")
    );

    router.get('/images', function (req, res) {
        var debug = {};
        debug.message = "Received get request for listing images";
        debug.query = req.query;

        var name = req.query.name;
        var version = req.query.version;

        if (!name && !version) {
            debug.act = 'Listing all images';
            var images = inventory.getAllImages();
            debug.images = images;
        }
        else if (name && !version) {
            debug.act = 'Listing all images for os named ' + name;
            // to be implemented
        }
        else {
            debug.act = 'Listing all images for os named ' + name + " version " + version;
            // to be implemented
        }

        return res.json(debug);
    });

    router.put('/images', function (req, res) {
        var debug = {};
        debug.message = "Received put request for create images";
        debug.query = req.query;
        debug.body = req.body;

        try {
            var name = req.query.name || req.body.name
            var version = req.query.version || req.body.version

            // 'isostore=test.iso': use iso files that's already in the store'
            // 'isolocal=/home/onrack/test.ios' use iso file that is in on-static local fs
            // 'isoweb=http://test.org/test.iso': use iso file from web
            // 'isoclient=isoclient': upload iso file from client

            var isostore = req.query.isostore || req.body.isostore;
            var isolocal = req.query.isolocal || req.body.isolocal;
            var isoweb = req.query.isoweb || req.body.isoweb;
            var isoclient = req.query.isoclient || req.body.isoclient;

            var source;
            var iso;
            if (isostore) {
                source = 'store';
                iso = path.join()isostore;
            } else if (isolocal) {
                source = 'local';
                iso = isolocal;
            } else if (isoweb) {
                source = 'web';
                iso = isoweb;
            } else if (isoclient) {
                source = 'client';
                iso = isoclient;
            } else {
                throw new Error('at least one iso source should be specified: '
                    + 'isostore, isolocal, isoweb');
            }

            assert.string(name, 'OS name');
            assert.string(version, 'OS version');
            assert.string(iso, 'ISO file path');

            // check if image already exists
            if(!_.isEmpty(inventory.getOneImageByNameVersion(name, version))) {
                throw new Error('image already exists');
            }

            var image = {};
            image.id = uuid.v4();
            image.iso = iso;
            image.name = name;
            image.version = version;
            image.status = 'preparing'

            debug.act = 'Adding images for os named ' + name + " version " + version;

            if (source == 'client') {
                var destFilename = path.join(isoDirPath, iso);

                var uploader = new Uploader(destFilename);
                uploader.middleware(req, res, function () {
                    var images = inventory.addImage(source, image);
                    debug.images = images;
                    return res.end(JSON.stringify(debug));
                });
            } else {
                var images = inventory.addImage(source, image);
                debug.images = images;
                return res.json(debug);
            }
        } catch (err) {
            return res.status(500).json({ error: err.message, stack: err.stack })
        }

    });

    // router.patch('/images', function (req, res) {
    //     var debug = {};
    //     debug.message = "Received patch request for update images";
    //     debug.query = req.query;
    //     debug.body = req.body;

    //     try {
    //         assert.string(req.body.iso, 'ISO file path');
    //         assert.string(req.body.name, 'OS name');
    //         assert.string(req.body.version, 'OS version');

    //         var iso = req.body.iso;
    //         var name = req.body.name;
    //         var version = req.body.version;

    //         debug.act = 'Adding images for os named ' + name + " version " + version;

    //         var images = inventory.createImage(image);

    //         debug.images = images;
    //         return res.json(debug);
    //     } catch (err) {
    //         return res.status(500).json({ error: err.message, stack: err.stack })
    //     }
    // });

    router.delete('/images', function (req, res) {
        var debug = {};
        debug.message = "Received put request for delete images";
        debug.query = req.query;
        debug.body = req.body;

        try {
            var name = req.query.name || req.body.name
            var version = req.query.version || req.body.version

            assert.string(name, 'OS name');
            assert.string(version, 'OS version');

            debug.act = 'Deleting images for os named ' + name + " version " + version;

            var images = inventory.deleteImageByNameVersion(name, version);

            debug.images = images;
            return res.json(debug);
        } catch (err) {
            return res.status(500).json({ error: err.message, stack: err.stack })
        }
    });

    router.get('/iso', function (req, res) {
        var debug = {};
        debug.message = "Received get request for listing iso files";
        debug.query = req.query;

        try {
            var iso = inventory.getAllIso();
            debug.iso = iso;

            return res.json(debug);
        } catch (err) {
            return res.status(500).json({ error: err.message, stack: err.stack })
        }
    });

    router.delete('/iso', function (req, res) {
        var debug = {};
        debug.message = "Received request for deleting iso files";
        debug.query = req.query;

        try {
            var isoName = req.query.name || req.body.name;
            assert.string(isoName);
            var iso = inventory.deleteIso(isoName);
            debug.iso = iso;

            return res.json(debug);
        } catch (err) {
            return res.status(500).json({ error: err.message, stack: err.stack })
        }
    });

    router.put('/iso', function (req, res) {
        // uploader.single('avatar');
        var debug = {};
        debug.message = "Received request for add an iso file";
        debug.query = req.query;
        debug.body = req.body;

        try {
            var isoName = req.query.name || req.body.name;
            assert.string(isoName, 'name');

            var destFilename = path.join(isoDirPath, isoName);

            var uploader = new Uploader(destFilename);
            uploader.middleware(req, res, function () {
                res.end('');
            });
        } catch (err) {
            return res.status(500).json({ error: err.message, stack: err.stack })
        }
    });

    return router;
}
