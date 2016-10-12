// Copyright 2016, EMC, Inc.

'use strict';

module.exports = loggerFactory;

loggerFactory.$provide = 'Logger';
loggerFactory.$inject = [
    'assert',
    '_'
];

/**
 * loggerFactory returns a Logger instance.
 * @private
 */
function loggerFactory(
    assert,
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
        this.moduleName = moduleName;
    }

    Logger.prototype.log = function (level, message) {
        assert.ok(_.includes(levels, level));
        assert.string(message, 'message');
        var moduleNameStr = this.moduleName? '*' + this.moduleName + '*:' : ':';
        console.log('[',level.toUpperCase(),']', moduleNameStr, '', message)
    };

    _.forEach(levels, function (level) {
        Logger.prototype[level] = function (message) {
            this.log(level, message);
        };
    });

    Logger.initialize = function (moduleName) {
        return new Logger(moduleName);
    };

    return Logger;
}