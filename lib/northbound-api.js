// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express');

module.exports = internalApiFactory;

di.annotate(internalApiFactory, new di.Provide('northbound-api'));
di.annotate(internalApiFactory, new di.Inject(
    di.Injector,
    'assert',
    'Http.Services.RestApi',
    'Services.Inventory',
    'fs',
    'path',
    'Logger',
    'FileUploader',
    'Services.Configuration',
    'uuid'
)
);

function internalApiFactory(
    injector,
    assert,
    rest,
    inventory,
    fs,
    path,
    Logger,
    Uploader,
    configuration,
    uuid
) {
    var router = express.Router();

    var logger = Logger.initialize("northboundApi");
    var isoDirPath = path.join(process.cwd(),
        configuration.get('isoDir', "./static/iso")
    );

    function uploadFile(req, res, image) {
        var destFilename = path.join(isoDirPath, image.iso);

        var uploader = new Uploader(destFilename);
        return uploader.middleware(req, res);
    }
    router.get('/images', rest(function() {
        return inventory.getAllImages();
    }));

    router.put('/images', rest(function(req,res) {
        var name = req.query.name || req.body.name;
        var version = req.query.version || req.body.version;

        var isostore = req.query.isostore || req.body.isostore;
        var isolocal = req.query.isolocal || req.body.isolocal;
        var isoweb = req.query.isoweb || req.body.isoweb;
        var isoclient = req.query.isoclient || req.body.isoclient;

        var source;
        var iso;
        if (isostore) {
            source = 'store';
            iso = path.join(isoDirPath, isostore);
        } else if (isolocal) {
            source = 'local';
            iso = isolocal;
        } else if (isoweb) {
            source = 'web';
            iso = isoweb;
        } else if (isoclient) {
            source = 'client';
            iso = path.join(isoDirPath, isoclient);
        } else {
            throw new Error('at least one iso source should be specified: ' +
                'isostore, isolocal, isoweb');
        }

        assert.string(name, 'OS name');
        assert.string(version, 'OS version');

        var image = {};
        image.id = uuid.v4();
        image.iso = iso;
        image.name = name;
        image.version = version;
        image.status = 'preparing';

        return Promise.resolve()
            .then(function() {
                if (source === 'client') {
                    return uploadFile(req, res, image);
                }
            })
            .then(function(){
                return inventory.addImage(source, image);
            });
    }));

    router.delete('/images', rest(function(req){
        var name = req.query.name || req.body.name;
        var version = req.query.version || req.body.version;

        assert.string(name, 'OS name');
        assert.string(version, 'OS version');

        return inventory.deleteImageByNameVersion(name, version);
    }));

    router.get('/iso', rest(function(){
        return inventory.getAllIso();
    }));

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
            return res.status(500).json({ error: err.message, stack: err.stack });
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
            return res.status(500).json({ error: err.message, stack: err.stack });
        }
    });

    return router;
}
