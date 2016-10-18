// Copyright 2016, EMC, Inc.

'use strict';

var _ = require('lodash');
var di = require('di');

if (require.main === module) { run(); }

function run() {
    // setup dependency injection
    var helper = require('./lib/di')(di, __dirname);
    var injectables = _.flattenDeep(
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
            require('./app'),

            // Glob Requirables
            helper.requireGlob(__dirname + '/lib/*.js')
        ]
    );

    var injector = new di.Injector(injectables);

    // setup app runner
    var app = injector.get('app');
    var Logger = injector.get('Logger');
    var logger = Logger.initialize("main");

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

// app.use(express.compress());
// app.use('/static', express.static('/home/onrack/test_ng/'));
// app.use('/static', directory('/home/onrack/', {'icons': true}));
// app.listen(process.env.PORT || 9998);
