// Copyright 2016, EMC, Inc.

'use strict';

require('./global-helper');

var util = require('util');

var index = require('../index');

global.onStaticContext = index.contextFactory();

global.dihelper = onStaticContext.helper;

helper.setupInjector(_.flattenDeep([
    onStaticContext.injectables
]));

// Suppress console log in unit test
helper.injector.get('Services.Configuration')
    .set('minLogLevel', 0);

helper.startServer = function (endpoints) {
    helper.injector.get('Services.Configuration')
        .set('httpEndpoints', endpoints);

    index.injector = helper.injector;

    return helper.injector.get('app').start();
};

helper.stopServer = function () {
    return helper.injector.get('app').stop();
};

helper.request = function (url, options) {
    var agent = request(url || 'http://localhost:8089', options);

    // monkeypatch supertest objects to have a "then" function so they can be used as promises
    _.methods(agent).forEach(function (method) {
        var orig = agent[method];
        agent[method] = function () {
            var test = orig.apply(agent, arguments);

            test.then = function (successCallback, errorCallback) {
                var deferred = new Promise(function (resolve, reject) {
                    test.end(function (err, res) {
                        if (err) {
                            // if a status check fails, supertest will pass the res object as well.
                            // so, append some extra verbosity to the error for the report.
                            if (res) {
                                var output = res.body || res.text;
                                err.message +=
                                    '\nResponse body:\n' +
                                    util.inspect(output) +
                                    '\n' + err.stack;
                            }
                            reject(err);
                            return;
                        } else {
                            resolve(res);
                        }
                    });
                });

                return deferred.then(successCallback, errorCallback);
            };
            return test;
        };
    });

    return agent;
};
