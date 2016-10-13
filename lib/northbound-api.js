// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express');

module.exports = internalApiFactory;

di.annotate(internalApiFactory, new di.Provide('northbound'));
di.annotate(internalApiFactory, new di.Inject(
    di.Injector,
    'northbound-router'
)
);

function internalApiFactory(injector, northboundRouter) {
    var router = express.Router();

    router.mount = function () {

        // Un-mount existing routes when mounting.
        this.unMountAllRouters();

        // router.use(northboundRouter);
    };

    router.unMountAllRouters = function () {
        this.stack = [];
    };

    router.get('/', function (req, res) {
        // logger.debug("Received request for file by uuid");

        return res.end('hello');

    });

    router.get('/test', function (req, res) {
        // logger.debug("Received request for test");

        return res.end('hello test');

    });

    return router;
}
