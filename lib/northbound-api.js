// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express');

module.exports = internalApiFactory;

di.annotate(internalApiFactory, new di.Provide('northbound'));
di.annotate(internalApiFactory, new di.Inject(
        di.Injector
    )
);

function internalApiFactory (injector) {
    var router = express.Router();

    router.mount = function() {

        // Un-mount existing routes when mounting.
        this.unMountAllRouters();

        // router.use(injector.get(require('./northbound-router')));
    };

    router.unMountAllRouters = function(){
        this.stack = [];
    };

    return router;
}
