// Copyright 2015, EMC, Inc.

'use strict';

describe("Errors", function() {
    var Errors = helper.injector.get('Errors');

    helper.after();

    describe('Error', function () {
        describe('toJSON', function () {
            before(function () {
                this.subject = new Error('test').toJSON();
            });

            it('should have a name property', function () {
                this.subject.name.should.equal('Error');
            });

            it('should have a message property', function () {
                this.subject.message.should.equal('test');
            });

            it('should have a stack property', function () {
                this.subject.stack.should.not.equal(undefined);
            });

            it('should have a context property', function () {
                this.subject.context.should.deep.equal({});
            });

            it('should include additional properties in context', function () {
                var error = new Error('test');
                error.status = 200;
                error.toJSON().context.status.should.equal(200);
            });
        });
    });

    describe('BaseError', function () {
        before(function () {
            this.subject = new Errors.BaseError('message');
        });

        it('should be an instance of Error', function () {
            this.subject.should.be.an.instanceof(Error);
        });

        it('should be an instance of BaseError', function () {
            this.subject.should.be.an.instanceof(Errors.BaseError);
        });

        it('should have a name of BaseError', function () {
            this.subject.name.should.be.equal('BaseError');
        });

        it('should have a message of message', function () {
            this.subject.message.should.be.equal('message');
        });

        it('should provide the correct stack trace', function () {
            this.subject.stack.split('\n')[1].should.contain(__filename);
        });
    });

    describe('BadRequestError', function () {
        before(function () {
            this.subject = new Errors.BadRequestError('message');
        });

        it('should be an instance of Error', function () {
            this.subject.should.be.an.instanceof(Error);
        });

        it('should be an instance of BaseError', function () {
            this.subject.should.be.an.instanceof(Errors.BaseError);
        });

        it('should be an instance of BadRequestError', function () {
            this.subject.should.be.an.instanceof(Errors.BadRequestError);
        });

        it('should have a name of BadRequestError', function () {
            this.subject.name.should.be.equal('BadRequestError');
        });

        it('should have a message of message', function () {
            this.subject.message.should.be.equal('message');
        });

        it('should provide the correct stack trace', function () {
            this.subject.stack.split('\n')[1].should.contain(__filename);
        });

        it('should provide a status', function () {
            this.subject.status.should.equal(400);
        });
    });

    describe('MyError', function () {
        before(function () {
            this.subject = new Errors.MyError('message');
        });

        it('should be an instance of Error', function () {
            this.subject.should.be.an.instanceof(Error);
        });

        it('should be an instance of BaseError', function () {
            this.subject.should.be.an.instanceof(Errors.BaseError);
        });

        it('should be an instance of MyError', function () {
            this.subject.should.be.an.instanceof(Errors.MyError);
        });

        it('should have a name of MyError', function () {
            this.subject.name.should.be.equal('MyError');
        });

        it('should have a message of message', function () {
            this.subject.message.should.be.equal('message');
        });

        it('should provide the correct stack trace', function () {
            this.subject.stack.split('\n')[1].should.contain(__filename);
        });
    });

    describe('InternalServerError', function () {
        before(function () {
            this.subject = new Errors.InternalServerError('message');
        });

        it('should be an instance of Error', function () {
            this.subject.should.be.an.instanceof(Error);
        });

        it('should be an instance of BaseError', function () {
            this.subject.should.be.an.instanceof(Errors.BaseError);
        });

        it('should be an instance of InternalServerError', function () {
            this.subject.should.be.an.instanceof(Errors.InternalServerError);
        });

        it('should have a name of InternalServerError', function () {
            this.subject.name.should.be.equal('InternalServerError');
        });

        it('should have a message of message', function () {
            this.subject.message.should.be.equal('message');
        });

        it('should provide the correct stack trace', function () {
            this.subject.stack.split('\n')[1].should.contain(__filename);
        });

        it('should provide a status', function () {
            this.subject.status.should.equal(500);
        });
    });

    describe('UnauthorizedError', function () {
        before(function () {
            this.subject = new Errors.UnauthorizedError('message');
        });

        it('should be an instance of Error', function () {
            this.subject.should.be.an.instanceof(Error);
        });

        it('should be an instance of BaseError', function () {
            this.subject.should.be.an.instanceof(Errors.BaseError);
        });

        it('should be an instance of UnauthorizedError', function () {
            this.subject.should.be.an.instanceof(Errors.UnauthorizedError);
        });

        it('should have a name of UnauthorizedError', function () {
            this.subject.name.should.be.equal('UnauthorizedError');
        });

        it('should have a message of message', function () {
            this.subject.message.should.be.equal('message');
        });

        it('should provide the correct stack trace', function () {
            this.subject.stack.split('\n')[1].should.contain(__filename);
        });

        it('should provide a status', function () {
            this.subject.status.should.equal(401);
        });
    });

    describe('ForbiddenError', function () {
        before(function () {
            this.subject = new Errors.ForbiddenError('message');
        });

        it('should be an instance of Error', function () {
            this.subject.should.be.an.instanceof(Error);
        });

        it('should be an instance of BaseError', function () {
            this.subject.should.be.an.instanceof(Errors.BaseError);
        });

        it('should be an instance of ForbiddenError', function () {
            this.subject.should.be.an.instanceof(Errors.ForbiddenError);
        });

        it('should have a name of ForbiddenError', function () {
            this.subject.name.should.be.equal('ForbiddenError');
        });

        it('should have a message of message', function () {
            this.subject.message.should.be.equal('message');
        });

        it('should provide the correct stack trace', function () {
            this.subject.stack.split('\n')[1].should.contain(__filename);
        });

        it('should provide a status', function () {
            this.subject.status.should.equal(403);
        });
    });

    describe('NotFoundError', function () {
        before(function () {
            this.subject = new Errors.NotFoundError('message');
        });

        it('should be an instance of Error', function () {
            this.subject.should.be.an.instanceof(Error);
        });

        it('should be an instance of BaseError', function () {
            this.subject.should.be.an.instanceof(Errors.BaseError);
        });

        it('should be an instance of NotFoundError', function () {
            this.subject.should.be.an.instanceof(Errors.NotFoundError);
        });

        it('should have a name of NotFoundError', function () {
            this.subject.name.should.be.equal('NotFoundError');
        });

        it('should have a message of message', function () {
            this.subject.message.should.be.equal('message');
        });

        it('should provide the correct stack trace', function () {
            this.subject.stack.split('\n')[1].should.contain(__filename);
        });

        it('should provide a status', function () {
            this.subject.status.should.equal(404);
        });
    });

    describe('ConflictError', function () {
        before(function () {
            this.subject = new Errors.ConflictError('message');
        });

        it('should be an instance of Error', function () {
            this.subject.should.be.an.instanceof(Error);
        });

        it('should be an instance of BaseError', function () {
            this.subject.should.be.an.instanceof(Errors.BaseError);
        });

        it('should be an instance of ConflictError', function () {
            this.subject.should.be.an.instanceof(Errors.ConflictError);
        });

        it('should have a name of ConflictError', function () {
            this.subject.name.should.be.equal('ConflictError');
        });

        it('should have a message of message', function () {
            this.subject.message.should.be.equal('message');
        });

        it('should provide the correct stack trace', function () {
            this.subject.stack.split('\n')[1].should.contain(__filename);
        });

        it('should provide a status', function () {
            this.subject.status.should.equal(409);
        });
    });

    describe('RequestTimedOutError', function () {
        before(function () {
            this.subject = new Errors.RequestTimedOutError('message');
        });

        it('should be an instance of Error', function () {
            this.subject.should.be.an.instanceof(Error);
        });

        it('should be an instance of BaseError', function () {
            this.subject.should.be.an.instanceof(Errors.BaseError);
        });

        it('should be an instance of RequestTimedOutError', function () {
            this.subject.should.be.an.instanceof(Errors.RequestTimedOutError);
        });

        it('should have a name of RequestTimedOutError', function () {
            this.subject.name.should.be.equal('RequestTimedOutError');
        });

        it('should have a message of message', function () {
            this.subject.message.should.be.equal('message');
        });

        it('should provide the correct stack trace', function () {
            this.subject.stack.split('\n')[1].should.contain(__filename);
        });

        it('should provide a status', function () {
            this.subject.status.should.equal(408);
        });
    });
});
