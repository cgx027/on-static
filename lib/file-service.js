// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = factory;
di.annotate(factory, new di.Provide('fileService'));
di.annotate(factory,
    new di.Inject(
        "assert",
        "_"
    )
);

function factory(assert, _) {

    function FileService() {
        return this;
    }

    FileService.prototype.start = function(config) {
        // var self = this;
        self.config = config || {};

        assert.string(config.serviceRoot, 'string');

        console.log('static file server started');
        return;

    };

    FileService.prototype.stop = function(config) {
        console.log('static file server stopped');
        return;

    };

    return new FileService();
}
