// Copyright 2016, EMC, Inc.

'use strict';

module.exports = ErrorFactory;

ErrorFactory.$provide = 'Errors';
ErrorFactory.$inject = [
    'util'
];

function ErrorFactory(util) {
    /**
     * Base error object which should be inherited, not used directly.
     * @constructor
     * @param {string} message Error Message
     */
    function BaseError(message, context) {
        this.message = message;
        this.name = this.constructor.name;
        this.context = context || {};

        Error.captureStackTrace(this, BaseError);
    }
    util.inherits(BaseError, Error);

    // TODO: Add prototype helpers to BaseError below here.

    // TODO: Add prototype helpers to BaseError above here.

    /**
     * Pretend Error as a Proof of Concept.
     * @constructor
     * @param {string} message Error Message
     */
    function MyError(message) {
        BaseError.call(this, message);
        Error.captureStackTrace(this, MyError);
    }
    util.inherits(MyError, BaseError);

    function BadRequestError(message, context) {
        BaseError.call(this, message, context);
        Error.captureStackTrace(this, BadRequestError);
        this.status = 400;
    }
    util.inherits(BadRequestError, BaseError);

    function InternalServerError(message, context) {
        BaseError.call(this, message, context);
        Error.captureStackTrace(this, InternalServerError);
        this.status = 500;
    }
    util.inherits(InternalServerError, BaseError);

    function UnauthorizedError(message, context) {
        BaseError.call(this, message, context);
        Error.captureStackTrace(this, UnauthorizedError);
        this.status = 401;
    }
    util.inherits(UnauthorizedError, BaseError);

    function ForbiddenError(message, context) {
        BaseError.call(this, message, context);
        Error.captureStackTrace(this, ForbiddenError);
        this.status = 403;
    }
    util.inherits(ForbiddenError, BaseError);

    function NotFoundError(message, context) {
        BaseError.call(this, message, context);
        Error.captureStackTrace(this, NotFoundError);
        this.status = 404;
    }
    util.inherits(NotFoundError, BaseError);

    function ConflictError(message, context) {
        BaseError.call(this, message, context);
        Error.captureStackTrace(this, ConflictError);
        this.status = 409;
    }
    util.inherits(ConflictError, BaseError);

    function RequestTimedOutError(message) {
        BaseError.call(this, message);
        Error.captureStackTrace(this, RequestTimedOutError);
        this.status = 408;
    }
    util.inherits(RequestTimedOutError, BaseError);

    return {
        BaseError: BaseError,
        MyError: MyError,
        BadRequestError: BadRequestError,
        InternalServerError: InternalServerError,
        UnauthorizedError: UnauthorizedError,
        ForbiddenError: ForbiddenError,
        NotFoundError: NotFoundError,
        ConflictError: ConflictError,
        RequestTimedOutError: RequestTimedOutError
    };
}
