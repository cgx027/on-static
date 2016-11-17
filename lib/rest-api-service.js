// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
var bodyParser = require('body-parser');
var http = require('http');

module.exports = restFactory;

di.annotate(restFactory, new di.Provide('Http.Services.RestApi'));
di.annotate(restFactory,
    new di.Inject(
        'Promise',
        '_',
        'assert',
        'util',
        'Errors',
        'Logger',
        di.Injector
    )
);

function restFactory(
    Promise,
    _,
    assert,
    util,
    Errors,
    Logger,
    injector
) {

    var logger = Logger.initialize('restService');

    var NO_CONTENT_STATUS = 204;
    var BAD_REQUEST_STATUS = 400;
    var ERROR_STATUS = 500;

    /**
     * Convenience constructor for HTTP errors. These errors can be thrown or used as a rejected
     * value from any serializer, deserializer or callback to {@link rest}.
     *
     * @param {number} status HTTP status code to send.
     * @param {string} [message] Error text to be presented to the user.
     * @param {*} [context] Additional error metadata.
     */

    function HttpError(status, message, context) {
        HttpError.super_.call(this, message, context);
        this.status = status;
    }

    util.inherits(HttpError, Errors.BaseError);

    /**
     * Middleware factory function for generic REST API services. Currently only supports JSON
     * input/output. There are five steps to the middleware:
     *
     * - parse - Parse JSON input and throw errors if parsing fails
     * - exec - Run the provided callback and capture its output
     * - render - Stringify JSON output and write out the request
     *
     * Valid options:
     *
     * - parseOptions {object} - Options to pass to JSON body parser.
     * - renderOptions {object} - Options to pass to render middleware. See {@link rest#render}.
     *
     * @param {function} callback Callback that takes req and res parameters and has its return
     *                            value resolved as a promise. When the promise is resolved or
     *                            rejected, the value will be written out as the response body.
     * @param {object} [options] Options hash.
     * @returns {function[]} Middleware pipeline.
     */

    function rest(callback, options) {
        assert.func(callback, 'callback function is required');
        assert.optionalObject(options, 'options should be an optional object');

        options = options || {};

        var middleware = [
            rest.parse(options.parseOptions),
            rest.exec(callback),
            rest.render(options.renderOptions),
            rest.handleError()
        ];

        return middleware;
    }

    /**
     * Parses JSON from the request body into req.body. Uses body-parser internally.
     * @param {object} options Options hash. Passed directly to body parser.json().
     * @returns {function} Middleware function.
     */

    rest.parse = function (options) {
        assert.optionalObject(options, 'options should be an optional object');
        options = options || {};

        var parser = bodyParser.json(options);
        return function parserMiddleware(req, res, next) {
            if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
                var contentLength = parseInt(req.headers['content-length'], 10);
                var contentType = req.headers['Content-Type'];

                if(contentType === 'application/json') {
                    if (contentLength) {
                        parser(req, req, function (err) {
                            if (err) {
                                err.message = 'Error parsing JSON: ' + err.message;
                            }
                            next(err);
                        });
                        return;
                    }
                }
            }
            next();
        };
    };

    /**
     * Takes a promise-returning callback and returns a middleware function that calls next() when
     * the promise resolves.
     * @param {function} callback Callback that takes req and res parameters and has its return
     *                            value resolved as a promise. When the promise is resolved or
     *                            rejected, the next() function will be called.
     * @returns {function} Middleware function.
     */

    rest.async = function (callback) {
        assert.func(callback, 'callback should be a function');
        return function asyncMiddleware(req, res, next) {
            Promise.resolve().then(function () {
                return callback(req, res);
            }).then(function () {
                next();
            }).catch(function (err) {
                next(err || new Error());
            });
        };
    };

    /**
     * Takes a promise-returning callback and sets the resolved value to res.body, then calls
     * next().
     * @param {function} callback Callback that takes req and res parameters and returns the value
     *                            to output in the response body, or a promise resolved to the
     *                            desired output.
     * @returns {function} Middleware function.
     */

    rest.exec = function (callback) {
        assert.func(callback, 'callback should be a function');
        return rest.async(function execMiddleware(req, res) {
            return Promise.resolve(callback(req, res))
                .then(function (value) {
                    res.body = value;
                });
        });
    };

    /**
     * Writes out the content of res.body as JSON. Valid options:
     *
     * - success [integer] - Response code to send on success.
     *
     * @param {object} options Options hash.
     * @returns {function} Middleware function.
     */

    rest.render = function (options) {
        assert.optionalObject(options, 'options should be an optional object');
        options = options || {};

        assert.optionalNumber(options.success, 'options.success should be an optional number');
        if (options.success) {
            assert.isIn(options.success.toString(), _.keys(http.STATUS_CODES));
        }

        return function renderMiddleware(req, res, next) {
            if (!res.headersSent) {
                if (res.body === null || res.body === undefined) {
                    res.status(NO_CONTENT_STATUS);
                    res.end();
                } else {
                    if (options.success) {
                        res.status(options.success);
                    }
                    res.json(res.body);
                }
            } else {
                res.end();
            }
            next();
        };
    };

    /**
     * Catches errors and writes them out as JSON.
     * @returns {function} Middleware function.
     */

    rest.handleError = function () {
        return function handleErrorMiddleware(err, req, res, next) {
            // TODO - implement custom error type serializers
            if (err instanceof Error) {
                var message = err.message || http.STATUS_CODES[err.status] || 'Unspecified Error';
                logger.error(message, {
                    error: err,
                    path: req.path
                });

                if (!err.status || err.status === ERROR_STATUS) {
                    res.status(ERROR_STATUS);
                    res.json({
                        message: message
                    });
                } else {
                    res.status(err.status);
                    res.json({
                        message: message
                    });
                }
            } else if (typeof err === 'string') {
                res.status(ERROR_STATUS);
                res.json({
                    message: err
                });
            } else {
                res.status(ERROR_STATUS);
                res.json(err);
            }

            next(err);
        };
    };

    rest.HttpError = HttpError;

    return rest;
}
