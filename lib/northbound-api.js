// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express');

module.exports = internalApiFactory;

di.annotate(internalApiFactory, new di.Provide('northbound-api'));
di.annotate(internalApiFactory, new di.Inject(
    di.Injector,
    'assert',
    'Errors',
    'Http.Services.RestApi',
    'Services.Inventory',
    'path',
    'Logger',
    'fs-operation',
    'FileUploader',
    'Services.Configuration',
    'uuid'
)
);

function internalApiFactory(
    injector,
    assert,
    Errors,
    rest,
    inventory,
    fs,
    path,
    Logger,
    fsOp,
    Uploader,
    configuration,
    uuid
) {
    var router = express.Router();

    var logger = Logger.initialize("northboundApi");
    var isoDirPath = path.join(process.cwd(),
        configuration.get('isoDir', "./static/iso")
    );

    function uploadFile(req, res, filePath) {
        var uploader = new Uploader(filePath);
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

        var source = isostore || isolocal || isoweb || isoclient;
        var iso;

        // if (isostore) {
        //     source = 'store';
        //     iso = path.join(isoDirPath, isostore);
        // } else if (isolocal) {
        //     source = 'local';
        //     iso = isolocal;
        // } else if (isoweb) {
        //     source = 'web';
        //     iso = isoweb;
        // } else if (isoclient) {
        //     source = 'client';
        //     iso = path.join(isoDirPath, isoclient);
        // } else {
        //     throw new Error('At least one iso source should be specified: ' +
        //         'isostore, isolocal, isoweb');
        // }

        assert.string(name, 'OS name');
        assert.string(version, 'OS version');
        assert.string(source, 'At least one iso source should be specified: ' +
            'isostore, isolocal, isoweb');

        var image = {};
        image.id = uuid.v4();
        image.iso = iso;
        image.name = name;
        image.version = version;
        image.status = 'preparing';

        return Promise.resolve()
            .then(function() {
                if (isoclient) {
                    var destPath = path.join(isoDirPath, image.iso);
                    return uploadFile(req, res, destPath);
                } else if(isolocal){
                    if(fsOp.checkPathReadable(isolocal)) {
                        return fsOp.createSymbolLink()
                        .catch(function(){
                            throw new Errors.InternalServerError(
                            'Error creating symbol link to ISO file');
                        });
                    } else{
                        throw new Errors.BadRequestError("Path is not readable");
                    }
                } else if(source === 'web'){
                    // place holder, download iso from web
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

    router.delete('/iso', rest(function(req){
        var isoName = req.query.name || req.body.name;
        assert.string(isoName);

        return inventory.deleteIso(isoName);
    }));

    router.put('/iso', rest(function(req){
        var isoName = req.query.name || req.body.name;
        assert.string(isoName, 'name');

        var destPath = path.join(isoDirPath, isoName);

        return uploadFile(destPath);
    }));

    return router;
}
