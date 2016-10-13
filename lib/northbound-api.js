// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express');

module.exports = internalApiFactory;

di.annotate(internalApiFactory, new di.Provide('northbound-api'));
di.annotate(internalApiFactory, new di.Inject(
    di.Injector,
    'assert',
    'image-tool',
    'Logger'
)
);

function internalApiFactory(
    injector,
    assert,
    imageTool,
    Logger) {
    var router = express.Router();

    var logger = Logger.initialize("northboundApi");

    router.get('/images', function (req, res) {
        var debug = {};
        debug.message = "Received get request for listing images";
        debug.query = req.query;

        var name = req.query.name || '';
        var version = req.query.version || '';

        if (!name && !version) {
            debug.act = 'Listing all images' + name;
            var images = imageTool.getAllImages();
            debug.images = images;
        }
        else if (name && !version) {
            debug.act = 'Listing all images for os named ' + name;
        }
        else {
            debug.act = 'Listing all images for os named ' + name + " version " + version;
        }

        return res.json(debug);
    });

    router.put('/images', function (req, res) {
        var debug = {};
        debug.message = "Received put request for listing images";
        debug.query = req.query;
        debug.body = req.body;

        assert.string(req.body.iso, 'ISO file path');
        assert.string(req.body.name, 'OS name');
        assert.string(req.body.version, 'OS version');

        var iso = req.body.iso;
        var name = req.body.name;
        var version = req.body.version;

        debug.act = 'Adding images for os named ' + name + " version " + version;

        var images = imageTool.createImage(iso, name, version);

        debug.images = images;
        return res.json(debug);
    });

    router.patch('/images', function (req, res) {
        var debug = {};
        debug.message = "Received put request for listing images";
        debug.query = req.query;
        debug.body = req.body;

        var name = req.body.name || '';
        var version = req.body.version || '';

        debug.act = 'Listing all images for os named ' + name + " version " + version;

        return res.json(debug);
    });

    return router;
}
