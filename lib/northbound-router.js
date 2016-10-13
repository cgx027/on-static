// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express');

module.exports = northboundRouterFactory;

di.annotate(northboundRouterFactory, new di.Provide('northbound-router'));
di.annotate(northboundRouterFactory,
    new di.Inject(
        'Logger',
        'assert'
    )
);

function northboundRouterFactory (
    Logger,
    assert
) {
    var logger = Logger.initialize('northboundRouter');
    var router = express.Router();
    /**
     * @api {get} /api/1.1/files/:uuid GET /:uuid
     * @apiVersion 1.1.0
     * @apiDescription get a file referenced by a BSON ID
     * @apiName files-get
     * @apiGroup files
     * @apiError NotFound The file with the <code>uuid</code> was not found.
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "File not found."
     *     }
     */

    router.get('/', function(req, res) {
        logger.debug("Received request for file by uuid");

        return res.send('hello');

    });

    router.get('/test', function(req, res) {
        logger.debug("Received request for test");

        return res.send('hello test');

    });

    console.log(router.stack)
    return router;
}
