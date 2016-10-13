// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');
var express = require('express');
var directory = require("serve-index");
var cors = require('cors');
var http = require('http');
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');

module.exports = httpServiceFactory;

di.annotate(httpServiceFactory, new di.Provide('Http.Server'));
di.annotate(httpServiceFactory,
    new di.Inject(
        'Services.Configuration',
        'Logger',
        'Promise',
        '_',
        'northbound-api',
        di.Injector
    )
);

/**
 * Factory that creates the express http service
 * @private
 * @param {Services.Configuration} configuration
 * @param Logger
 * @param Q
 * @param injector
 * @returns {function} HttpService constructor
 */
function httpServiceFactory(
    configuration,
    Logger,
    Promise,
    _,
    northboundApi,
    injector
) {
    var logger = Logger.initialize("httpService");

    function HttpService(endpoint) {
        this.app = express();
        this.endpoint = this._parseEndpoint(endpoint);
        this.server = null;
        this._setup();
    }

    HttpService.prototype.start = function () {
        var self = this;

        this.server = http.createServer(this.app);

        this.server.on('close', function () {
            logger.info('Server Closing.');
        });

        return new Promise(function (resolve, reject) {
            return self.server.listen(
                self.endpoint.port,
                self.endpoint.address,
                function (error) {
                    if(error) {
                        logger.error('Service start error');
                        logger.error(error);
                    }
                    return error ? reject(error) : resolve();
                });
        });
    };

    HttpService.prototype.stop = function () {
        var self = this;
        return new Promise(function (resolve, reject) {
            return self.server.close(
                function (error) {
                    return error ? reject(error) : resolve();
                });
        });
    };

    HttpService.prototype._setup = function () {
        var app = this.app;
        var endpoint = this.endpoint;

        // CORS Support
        // app.use(cors());
        // app.options('*', cors());

        // Parse request body. Limit set to 50MB
        app.use(bodyParser.json({ limit: '50mb' }));

        if (_.includes(endpoint.routers, 'southbound')) {
            var httpFileServiceRootDir = configuration.get('httpFileServiceRootDir', './static/http');
            var httpFileServiceApiRoot = configuration.get('httpFileServiceApiRoot', '/');

            // static file server
            app.use(httpFileServiceApiRoot, express.static(httpFileServiceRootDir));
            // static file server with UI
            app.use(httpFileServiceApiRoot, directory(httpFileServiceRootDir, { 'icons': true }));

            logger.info("Static file server defined "
                + "at API: http://" + endpoint.address + ":" + endpoint.port + httpFileServiceApiRoot);
        }

        if (_.includes(endpoint.routers, 'northbound')) {
            // var router;
            // try {
            //     router = injector.get('northbound-api');
            // } catch (e) {
            //     logger.error('Cound not found router named : ' + 'northbound-api, error:' + e);
            //     return;
            // }

            // router.mount();
            // app.use('/api', router);
            app.use('/', northboundApi);

            logger.info("Northbound API defined at http://"
                + endpoint.address + ":" + endpoint.port);
        }
    };

    HttpService.prototype._parseEndpoint = function (endpoint) {
        function parseRouterNames(routers) {
            if (_.isEmpty(routers)) {
                return ['northbound', 'southbound'];
            } else {
                if (_.isString(routers)) {
                    return [routers];
                }
                if (_.isArray(routers) && _.all(routers, _.isString)) {
                    return routers;
                }
                return ['northbound', 'southbound'];
            }
        }

        return {
            address: endpoint.address || '0.0.0.0',
            port: endpoint.port,
            routers: parseRouterNames(endpoint.routers)
        };
    };

    return HttpService;
}
