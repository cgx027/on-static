// Copyright 2016, EMC, Inc.

'use strict';

var _ = require('lodash');
var _di = require('di');

require('./lib/extensions.js');

var self = module.exports = {
    injector: null,
    contextFactory: contextFactory
};

function contextFactory(di, directory) {
    di = di || _di;

    var helper = require('./lib/di')(di, __dirname);

    return {
        helper: helper,

        initialize: function () {
            var injector = new di.Injector(_.flattenDeep([
                this.injectables
            ]));

            this.app = injector.get('app');
            this.logger = injector.get('Logger')
                .initialize('Http.Server');
            self.injector = injector;

            return this;
        },

        injectables: _.flattenDeep(
            [
                // NPM packages
                helper.simpleWrapper(_, '_'),
                helper.requireWrapper('nconf'),
                helper.requireWrapper('assert-plus', 'assert'),
                helper.requireWrapper('fs', 'fs'),
                helper.requireWrapper('path', 'path'),
                helper.requireWrapper('child_process', 'child_process'),
                helper.requireWrapper('bluebird', 'Promise'),
                helper.requireWrapper('express', 'express'),
                helper.requireWrapper('serve-index', 'serve-index'),
                helper.requireWrapper('node-uuid', 'uuid'),
                helper.requireWrapper('validator', 'validator'),
                helper.requireWrapper('mkdirp', 'mkdirp'),
                helper.requireWrapper('util', 'util'),
                helper.requireWrapper('lowdb', 'lowdb'),

                require('./app'),

                // Glob Requirables
                helper.requireGlob(__dirname + '/lib/api/*.js'),
                helper.requireGlob(__dirname + '/lib/common/*.js')
            ]
        ),
    };
}

if (require.main === module) { run(); }

function run() {
    var context = contextFactory().initialize(),
        app = context.app,
        logger = context.logger;

    app.start()
        .then(function () {
            logger.info('Server Started.');
        })
        .catch(function (error) {
            logger.critical('Server Startup Error.', { error: error });

            process.nextTick(function () {
                process.exit(1);
            });
        });

    process.on('SIGINT', function () {
        app.stop()
            .catch(function (error) {
                logger.critical('Server Shutdown Error.', { error: error });
            })
            .finally(function () {
                process.nextTick(function () {
                    process.exit(1);
                });
            });
    });
}

