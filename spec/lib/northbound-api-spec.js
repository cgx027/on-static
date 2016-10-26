// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe('northbound-api', function () {
    var Promise;
    var Errors;
    var stubNeedByIdentifier;
    var stubFind;

    before('start HTTP server', function () {
        this.timeout(5000);
        return helper.startServer([]).then(function () {
            Promise = helper.injector.get('Promise');
            Errors = helper.injector.get('Errors');
        });
    });

    after('stop HTTP server', function () {
        return helper.stopServer();
    });

    beforeEach("reset stubs", function() {
    });

    describe("GET /iso", function() {

        it("should a list of all iso", function() {

            return helper.request().get('/iso')
                .expect('Content-Type', /^application\/json/)
                .expect(200)
                .expect(function (res) {
                    expect(res.body).to.be.an("Array").with.length(1);
                    expect(res.body[0]).to.be.an("Object").with.property('id', "123");
                });
        });

    });

});
