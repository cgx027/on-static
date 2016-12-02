// Copyright 2015, EMC, Inc.

'use strict';

var _ = require('lodash'),
    util = require('util');

// TODO: get rid of this
/**
 * Provide default serialization for all Error objects.
 */
Object.defineProperty(Error.prototype, 'toJSON', {
    value: function () {
        // console.error('Using monkey-patched Error.prototype.toJSON method, ' +
        //     'which will be deprecated soon.');
        return {
            name: this.name,
            message: this.message,
            stack: this.stack,
            context: _.merge(
                // Create a default context if none exists.
                this.context || {},
                // Copy extra fields into context.
                _.omit(
                    this,
                    ['stack', 'arguments', 'name', 'message', 'context']
                )
            )
        };
    },
    configurable: true,
    writable: true
});

/**
 * Extension to String to allow for formatting of strings directly using
 * util.format.  "Hello %s".format("World") returns "Hello World".
 */
String.prototype.format = function () {
    return util.format.apply(
        null,
        _.flattenDeep([
            this,
            Array.prototype.slice.call(arguments)
        ])
    );
};
