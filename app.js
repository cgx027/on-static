// Copyright 2016, EMC, Inc.
/* jshint node: true */

"use strict";

var di = require('di');

module.exports = Runner;

di.annotate(Runner, new di.Provide('app'));
di.annotate(Runner, new di.Inject(
    'Http.Server',
    'Services.Configuration',
    'Logger',
    'Fs.Operation',
    'Promise',
    'Services.Inventory'
)
);
function Runner(
    HttpService,
    configuration,
    Logger,
    fsOp,
    Promise,
    inventory
) {
    var logger = Logger.initialize("app");

    var services = [];

    var defaultEndpoints = [
        {
            "address": "0.0.0.0",
            "port": 7070,
            "routers": "northbound"
        },
        {
            "address": "0.0.0.0",
            "port": 9090,
            "routers": "southbound"
        }
    ];

    function start() {
        return Promise.try(function(){
            inventory.initialize();

            var endpoints = configuration.get('httpEndpoints', defaultEndpoints);
            services = Promise.map(endpoints, function (endpoint) {
                return new HttpService(endpoint);
            }).each(function (service) {
                return service.start();
            });

            return services;
        })
            .then(function(){
                return fsOp.unmountAllIso();
            })
            .then(function(){
                return inventory.loadConfigAtBoot();
            });
    }

    function stop() {
        return Promise.map(services, function (service) {
            return service.stop();
        });
    }

    return {
        start: start,
        stop: stop
    };
}
