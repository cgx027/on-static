// Copyright 2016, EMC, Inc.

'use strict';

module.exports = loggerFactory;

loggerFactory.$provide = 'Logger';
loggerFactory.$inject = [
    'assert',
    'nconf',
    '_'
];

/**
 * loggerFactory returns a Logger instance.
 * @private
 */
function loggerFactory(
    assert,
    nconf,
    _
) {
    var logLevels = {
        critical: 5,
        error: 4,
        warning: 3,
        info: 2,
        debug: 1
    };

    var levels = _.keys(logLevels);


    function Logger(moduleName) {
        this.moduleName = moduleName || '';

        this.minLogLevel = nconf.get('minLogLevel');
        if((this.minLogLevel === undefined) || (typeof this.minLogLevel !== 'number')){
            this.minLogLevel = 0;
        }
    }

    Logger.prototype.log = function (level, message, context) {
        assert.ok(_.includes(levels, level));
        assert.string(message, 'message');

        if(logLevels[level] < this.minLogLevel) {
            return;
        }

        var moduleNameStr = this.moduleName? '*' + this.moduleName + '*:' : ':';
        if(context) {
            console.log('[',level.toUpperCase(),']', moduleNameStr, '',
                message,
                JSON.stringify(context)
            );
        } else {
            console.log('[',level.toUpperCase(),']', moduleNameStr, '',
                message
            );
        }
    };

    _.forEach(levels, function (level) {
        Logger.prototype[level] = function (message, context) {
            this.log(level, message, context);
        };
    });

    Logger.initialize = function (moduleName) {
        return new Logger(moduleName);
    };

    return Logger;

}
