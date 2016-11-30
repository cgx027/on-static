// Copyright 2015-2016, EMC, Inc.

'use strict';

var express = require('express');
var Promise = require('bluebird');

describe('Http.Server', function () {
    var HttpService = helper.injector.get('Http.Server');
    var services = [];
    var singleService;
    var defaultRouter = express.Router();

    before(function () {

        defaultRouter.use('/test', function (req, res) {
            res.send('Hello World!');
        });
    });

    helper.after();

    describe('http', function () {
        before('start', function () {
            // can't use port 80 because it requires setuid root
            singleService = new HttpService({ port: 7070, routers: 'northbound' });
            singleService.app.use(defaultRouter);
            return singleService.start();
        });

        it('should respond to requests', function () {
            return helper.request('http://localhost:7070')
                .get('/test')
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect('Hello World!');
        });

        after('stop', function () {
            return singleService.stop();
        });
    });

    describe('http multi endpoints', function () {

        before('start', function () {
            var endpoints = [
                {
                    "address": "0.0.0.0",
                    "port": 7071,
                    "routers": "northbound"
                },
                {
                    "address": "0.0.0.0",
                    "port": 9091,
                    "routers": "southbound"
                }
            ];

            var requestHandler = function (req, res) {
                res.send('This is from endpoint path ' + req.baseUrl);
            };

            return Promise.each(endpoints, function(endpoint, i){
                var service = new HttpService(endpoint);

                services.push(service);

                service.app.use('/test/' + i, requestHandler);
                return service.start();
            });
        });

        it('should respond to request to endpoint 1', function () {
            return helper.request('http://localhost:7071')
                .get('/test/0')
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect('This is from endpoint path /test/0');
        });

        it('should respond to request to endpoint 2', function () {
            return helper.request('http://localhost:9091')
                .get('/test/1')
                .set('Content-Type', 'application/json')
                .expect(200)
                .end('This is from endpoint path /test/1');
        });

        it('should respond Not Found to incorrect router path', function () {
            return helper.request('http://localhost:9091')
                .get('/test/4')
                .end(404);
        });

        after('stop', function () {
            return Promise.each(services, function(service){
                return service.stop();
            });
        });
    });
});
