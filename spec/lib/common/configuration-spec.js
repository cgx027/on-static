// Copyright 2015, EMC, Inc.


'use strict';

describe(require('path').basename(__filename), function () {

    var fs = helper.injector.get('fs');
    var path = helper.injector.get('path');
    var nconf = helper.injector.get('nconf');
    var subject = helper.injector.get('Services.Configuration');
    var configFilePath = path.join(process.cwd(), 'config.json');

    helper.after();

    describe('Instance Methods', function () {
        describe('set', function() {
            it('should chain', function() {
                subject.set('foo', 'bar').should.equal(subject);
            });

            it('should set the key to the given value', function() {
                subject.set('foo', 'bar').get('foo').should.equal('bar');
            });
        });

        describe('get', function() {
            it('should return the requested value', function() {
                subject.set('foo', 'bar').get('foo').should.equal('bar');
            });

            it('should use the default value provided if no value is defined', function() {
                subject.get('missing', 'override').should.be.equal('override');
            });
        });

        describe('start', function () {
            describe('defaults', function () {
                beforeEach(function () {
                    sinon.stub(fs, 'existsSync');
                    sinon.stub(nconf, 'file').returns();
                });

                afterEach(function () {
                    fs.existsSync.restore();
                    nconf.file.restore();
                });

                it('applies the configure file', function() {
                    fs.existsSync.withArgs(configFilePath).returns(true);
                    subject.load();
                    nconf.file.should.have.been.calledWith(
                        'file', {'file': configFilePath}
                    );
                });
            });
        });
    });
});
