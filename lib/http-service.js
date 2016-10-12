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
var rewriter = require('express-urlrewrite');

module.exports = httpServiceFactory;

di.annotate(httpServiceFactory, new di.Provide('Http.Server'));
di.annotate(httpServiceFactory,
    new di.Inject(
        'Services.Configuration',
        'Logger',
        'Promise',
        '_',
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

        logger.info('debug, in service start');
        this.server = http.createServer(this.app);

        this.server.on('close', function () {
            logger.info('Server Closing.');
        });

        return new Promise(function (resolve, reject) {
            return self.server.listen(
                self.endpoint.port,
                self.endpoint.address,
                function (error) {
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
        app.use(cors());
        app.options('*', cors());

        logger.info('debug, in service _setup');

        // Parse request body. Limit set to 50MB
        app.use(bodyParser.json({ limit: '50mb' }));

        if (_.includes(endpoint.routers, 'southbound')) {
            var httpStaticRoot = configuration.get('staticRootDir', './static/http');
            var httpFileServiceApiRoot = configuration.get('httpFileServiceApiRoot', '/');

            // static file server
            app.use(httpFileServiceApiRoot, express.static(httpStaticRoot));
            // static file server with UI
            app.use(httpFileServiceApiRoot, directory(httpStaticRoot, { 'icons': true }));

            logger.info("Static file server defined, file path: " + httpStaticRoot
                + " ,API: " + endpoint.address + ":" + endpoint.port + httpFileServiceApiRoot);
        }

        //re-route common and current
        var versionPath = configuration.get('versionBase', '1.0');
        app.use(rewriter('/api/current/*', '/api/' + versionPath + '/$1'));
        app.use(rewriter('/api/common/*', '/api/' + versionPath + '/$1'));

        // Mount API Routers
        // _.forEach(endpoint.routers, function (routerName) {
        //     var router;
        //     try {
        //         router = injector.get(routerName);
        //     } catch (e) {
        //         logger.error('Cound not found router named : ' + routerName, { error: e });
        //         return;
        //     }

        //     router.mount();
        //     app.use(/\/api\/1\.0/, router);
        // });

        if (_.includes(endpoint.routers, 'northbound')) {
            var router;
            try {
                router = injector.get(routerName);
            } catch (e) {
                logger.error('Cound not found router named : ' + routerName, { error: e });
                return;
            }

            router.mount();
            app.use(/\/api\/1\.0/, router);

            logger.info("Northbound API defined at "
                + endpoint.address + ":" + endpoint.port + httpFileServiceApiRoot);
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
