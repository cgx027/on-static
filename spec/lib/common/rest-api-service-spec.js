// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var express = require('express');
var util = require('util');

var PORT = 8089;
var TESTURL = 'http://localhost:' + PORT;

// setup/teardown for express app within a describe block
function expressAppSetup(callback) {
    var server;
    beforeEach('create express app', function () {
        var app = express();
        callback(app);
        server = app.listen(PORT);
    });

    afterEach('close express app', function () {
        server.close();
    });
}

describe('Http.Server', function () {
    var rest = helper.injector.get('Http.Services.RestApi');
    var Errors = helper.injector.get('Errors');
    var Promise = helper.injector.get('Promise');

    before('set up test dependencies', function() {
    });

    describe('rest()', function () {
        var app;
        expressAppSetup(function (app_) {
            app = app_;
        });

        it('should 200 with a returned object literal', function () {

            app.get('/testfuncstatic', rest(function () {
                return Promise.resolve({ foo: 'bar' });
            }));

            return helper.request(TESTURL).get('/testfuncstatic')
                .expect('Content-Type', /^application\/json/)
                .expect(200, { foo: 'bar' });
        });

        it('should 200 with a returned array literal', function () {
            app.get('/testfuncstatic', rest(function () {
                return [{ foo: 'bar' }, { foo: 'baz' }];
            }, { isArray: true }));

            return helper.request(TESTURL).get('/testfuncstatic')
                .expect('Content-Type', /^application\/json/)
                .expect(200, [{ foo: 'bar' }, { foo: 'baz' }]);
        });

        it('should have an undefined body when POSTing no content',
            function () {
                app.post('/testblankbody', rest(function (req) {
                    expect(req.body).to.be.undefined;
                    return { bad: 'notbad' };
                }));

                return helper.request(TESTURL).post('/testblankbody')
                    .set('Content-Type', 'application/json')
                    .expect('Content-Type', /^application\/json/)
                    .expect(200, { bad: 'notbad' });
            });

        it('should 400 when POSTing bad JSON', function () {
            app.post('/testbadjson', rest(function () {
                return { foo: 'bar' };
            }));

            return helper.request(TESTURL).post('/testbadjson')
                .set('Content-Type', 'application/json')
                .send('{badjson-1;d.c;zdg}')
                .expect('Content-Type', /^application\/json/)
                .expect(400)
                .expect(function (req) {
                    expect(req.body).to.have.property('message')
                        .to.equal('Error parsing JSON: Unexpected token b');
                });
        });

        it('should 200 when POSTing a non-JSON content-type', function () {
            app.post('/testbadcontenttype', rest(function () {
                return { foo: 'bar' };
            }));

            return helper.request(TESTURL).post('/testbadcontenttype')
                .set('Content-Type', 'text/plain')
                .send('happy text string')
                .expect('Content-Type', /^application\/json/)
                .expect(200)
                .expect({foo: 'bar'});
        });

        it('should allow setting a status code from the callback', function () {
            app.get('/testfuncmanual', rest(function (req, res) {
                res.status(202);
                // this return value should get ignored
                return { bar: 'baz' };
            }));

            return helper.request(TESTURL).get('/testfuncmanual')
                .expect('Content-Type', /^application\/json/)
                .expect(202, { bar: 'baz' });
        });

        it('should allow writing a response from the callback', function () {
            app.get('/testfuncmanual', rest(function (req, res) {
                res.status(201);
                res.json({ bar: 'foo' });
                // this return value should get ignored
                return { foo: 'bar' };
            }));

            return helper.request(TESTURL).get('/testfuncmanual')
                .expect('Content-Type', /^application\/json/)
                .expect(201, { bar: 'foo' });
        });

        it('should 500 error on thrown error', function () {
            app.get('/testerrorthrow', rest(function () {
                throw Error('broken route');
            }));

            return helper.request(TESTURL).get('/testerrorthrow')
                .expect('Content-Type', /^application\/json/)
                .expect(500)
                .expect(function (req) {
                    expect(req.body).to.have.property('message').that.equals('broken route');
                });
        });

        it('should return a custom status code for success', function () {
            app.get('/testsuccess201', rest(function () {
                return { success: ':)' };
            }, {
                renderOptions: {
                    success: 201
                }
            }));

            return helper.request(TESTURL).get('/testsuccess201')
                .expect('Content-Type', /^application\/json/)
                .expect(201, { success: ':)' });
        });

        it('should 200 with a resolved promise', function () {
            app.get('/testfuncpromise', rest(function () {
                return Promise.resolve({ foo: 'baz' });
            }));

            return helper.request(TESTURL).get('/testfuncpromise')
                .expect('Content-Type', /^application\/json/)
                .expect(200, { foo: 'baz' });
        });

        it('should 500 error on rejected promise with an Error', function () {
            app.get('/testpromisereject', rest(function () {
                return Promise.reject(new Error('broken promise'));
            }));

            return helper.request(TESTURL).get('/testpromisereject')
                .expect('Content-Type', /^application\/json/)
                .expect(500)
                .expect(function (req) {
                    expect(req.body).to.have.property('message').that.equals('broken promise');
                });
        });

        it('should 500 error on rejected promise with a string', function () {
            app.get('/testpromiserejectstring', rest(function () {
                return Promise.reject('broken promise string');
            }));

            return helper.request(TESTURL).get('/testpromiserejectstring')
                .expect('Content-Type', /^application\/json/)
                .expect(500)
                .expect(function (req) {
                    expect(req.body).to.have.property('message')
                        .that.equals('broken promise string');
                });
        });

        it('should 500 error on rejected promise with an object', function () {
            app.get('/testpromiserejectobject', rest(function () {
                return Promise.reject({ thing: 'errored' });
            }));

            return helper.request(TESTURL).get('/testpromiserejectobject')
                .expect('Content-Type', /^application\/json/)
                .expect(500)
                .expect(function (req) {
                    expect(req.body).to.have.property('thing')
                        .that.equals('errored');
                });
        });

        it('should 500 error on rejected promise with undefined', function () {
            app.get('/testpromiserejectundefined', rest(function () {
                return Promise.reject();
            }));

            return helper.request(TESTURL).get('/testpromiserejectundefined')
                .expect('Content-Type', /^application\/json/)
                .expect(500)
                .expect(function (req) {
                    expect(req.body).to.have.property('message')
                        .that.equals('Unspecified Error');
                });
        });

        it('should 204 on blank content', function () {
            app.get('/testblankallowempty', rest(function () {
                return null;
            }));

            return helper.request(TESTURL).get('/testblankallowempty')
                .expect(204);
        });
    });
});
