// Copyright 2015, EMC, Inc.


'use strict';

var di = require('di');

describe('Logger', function () {
    var Logger = helper.injector.get('Logger');
    var configuration = helper.injector.get('Services.Configuration');

    helper.after();

    describe('Constructor', function () {
        it('should be a Logger', function () {
            expect(Logger.name).to.be.equal('Logger');
        });

        it('should assign module based on the provided string', function () {
            var logger = new Logger('module');

            expect(logger.moduleName).to.equal('module');
        });

        it('should assign a default module if none is provided', function () {
            var logger = new Logger();

            expect(logger.moduleName).to.equal('');
        });
    });

    describe('Class Methods', function () {
        describe('initialize', function () {
            it('should exist', function () {
                expect(Logger.initialize).to.be.a('function');
            });

            it('should return a Logger instance', function () {
                expect(Logger.initialize()).to.be.an.instanceof(Logger);
            });
        });
    });

    describe('Instance Methods', function () {
        before(function () {
            this.subject = new Logger('Test');
        });

        [
            'critical',
            'error',
            'warning',
            'info',
            'debug'
        ].forEach(function (level) {
            describe(level, function () {
                it('should be a function', function () {
                    expect(this.subject).to.respondTo(level);
                });

                it('should have 2 arguments', function () {
                    expect(this.subject).to.have.property(level).with.length(2);
                });
            });
        });

        it('log method should be a function', function () {
            expect(this.subject).to.respondTo('log');
        });

        it('log method should have 3 arguments', function () {
            expect(this.subject).to.have.property('log').with.length(3);
        });
    });
});
