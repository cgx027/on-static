// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express');

module.exports = NorthboundApiFactory;

di.annotate(NorthboundApiFactory, new di.Provide('northbound-api'));
di.annotate(NorthboundApiFactory, new di.Inject(
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
    'uuid',
    '_'
)
);

function NorthboundApiFactory(
    injector,
    assert,
    Errors,
    rest,
    inventory,
    path,
    Logger,
    fsOp,
    Uploader,
    configuration,
    uuid,
    _
) {
    var logger = Logger.initialize("northboundApi");
    var router = express.Router();

    var isoDirPath, microkernelDirPath;

    function NorthboundApi(){
    }

    function uploadFile(req, res, filePath) {
        var uploader = new Uploader(filePath);
        return uploader.upload(req, res)
            .then(function(){
                if(fsOp.getFileSizeSync(filePath) === 0){
                    return Promise.reject(new Errors.InternalServerError('Error uploading file'));
                }
            })
            .catch(function(){
                return fsOp.removeFile(filePath)
                    .finally(function(){
                        return Promise.reject(new Errors.BadRequestError('Error uploading file'));
                    });
            });
    }

    function uploadIsoFile(req, res, iso) {
        var isoPath = path.join(isoDirPath, iso);
        return uploadFile(req, res, isoPath);
    }

    function uploadMicrokernelFile(req, res, iso) {
        var microkernelPath = path.join(microkernelDirPath, iso);
        return uploadFile(req, res, microkernelPath);
    }

    function createSymbolLinkInStore(localPath, isoName) {
        if(fsOp.checkPathReadableSync(localPath)) {
            var destPath = path.join(isoDirPath, isoName);

            return fsOp.createSymbolLink(localPath, destPath)
                .catch(function(){
                    return Promise.resolve(
                        new Errors.InternalServerError('Error creating symbol link to ISO file')
                    );
                });
        } else{
            return Promise.reject(new Errors.BadRequestError("Path is not readable"));
        }
    }

    function getImageQuery(req){
        var query = {};

        query.id = req.query.id;
        query.name = req.query.name;
        query.version = req.query.version;
        query.iso = req.query.iso;
        query.status = req.query.status;

        return _(query).omit(_.isUndefined).omit(_.isNull).value();
    }

    NorthboundApi.prototype.getRouter = function getRouter(){
        isoDirPath = path.join(process.cwd(),
            configuration.get('isoDir', "./static/iso")
        );

        microkernelDirPath = path.join(process.cwd(),
            configuration.get('microkernelDir', "./static/common")
        );

        inventory.initialize();

        router.get('/images', rest(function(req) {
            return inventory.findImagesByQuery(getImageQuery(req));
        }));

        router.put('/images', rest(function(req, res) {
            req.query = req.query || {};
            req.body = req.body || {};

            var name = req.query.name || req.body.name;
            var version = req.query.version || req.body.version;

            var isostore = req.query.isostore || req.body.isostore;
            var isolocal = req.query.isolocal || req.body.isolocal;
            var isoweb = req.query.isoweb || req.body.isoweb;
            var isoclient = req.query.isoclient || req.body.isoclient;

            var source = isostore || isolocal || isoweb || isoclient;

            assert.string(name, 'OS name');
            assert.string(version, 'OS version');
            assert.string(source, 'At least one iso source should be specified: ' +
                'isostore, isolocal, isoweb');

            var image = {};
            image.id = uuid.v4();
            image.name = name;
            image.version = version;
            image.status = 'OK';

            return inventory.getOneImageByNameVersion(name, version)
                .then(function(image){
                    if(image) {
                        throw new Errors.BadRequestError('Image already exists');
                    }
                })
                .then(function() {
                    if (isoclient) {
                        image.iso = isoclient;
                        return uploadIsoFile(req, res, image.iso);
                    } else if(isolocal){
                        image.iso = fsOp.getIsoNameFromStrSync(isolocal);
                        return createSymbolLinkInStore(isolocal, image.iso);
                    } else if(isoweb){
                        image.iso = fsOp.getIsoNameFromWebLinkSync(name, version, isoweb);
                        return inventory.downloadIso(image, isoweb);
                    } else if(isostore){
                        image.iso = isostore;
                        return Promise.resolve();
                    }
                })
                .then(function(){
                    return inventory.addImage(image);
                });
        }));

        router.delete('/images', rest(function(req){
            return inventory.deleteImageByQuery(getImageQuery(req));
        }));

        router.get('/iso', rest(function(){
            return inventory.getAllIso();
        }));

        router.delete('/iso', rest(function(req){
            var isoName = req.query.name || req.body.name;
            assert.string(isoName);

            return inventory.deleteIso(isoName);
        }));

        router.put('/iso', rest(function(req, res){
            var isoName = req.query.name || req.body.name;
            assert.string(isoName, 'name');

            return uploadIsoFile(req, res, isoName);
        }));

        router.get('/microkernel', rest(function(){
            return inventory.getAllMicrokernel();
        }));

        router.delete('/microkernel', rest(function(req){
            var mkName = req.query.name || req.body.name;
            assert.string(mkName);

            return inventory.deleteMicrokernel(mkName);
        }));

        router.put('/microkernel', rest(function(req, res){
            var mkName = req.query.name || req.body.name;
            assert.string(mkName, 'name');

            return uploadMicrokernelFile(req, res, mkName);
        }));

        return router;
    };

    return NorthboundApi;
}
