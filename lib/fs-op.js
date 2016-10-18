// Copyright 2016, EMC, Inc.

'use strict';

module.exports = fsOpFactory;

fsOpFactory.$provide = 'fs-operation';
fsOpFactory.$inject = [
    'assert',
    'Logger',
    'fs',
    'path',
    'mkdirp',
    'child_process',
    '_'
];

/**
 * fsOpFactory returns a fsOp instance.
 * @private
 */
function fsOpFactory(
    assert,
    Logger,
    fs,
    path,
    mkdirp,
    child_process,
    _
) {
    var logger = Logger.initialize("fs-op");

    function fsOp() {
    }

    fsOp.prototype.mkdirSync = function mkdirSync(path) {
        try {
            // fs.mkdirSync(path);
            logger.info('creating folder: ' + path)
            mkdirp.sync(path);
        } catch (err) {
            logger.error('Error creating folder ' + path + ' Error code: ' + err);
            // throw new Error('Error creating folder ' + path + ' Error code: ' + err);
        }
    }

    fsOp.prototype.checkPathWritable = function checkPathWritable(path) {
        try {
            fs.accessSync(path, fs.R_OK | fs.W_OK);
            return true;
        } catch (err) {
            logger.error('Path is not writable: ' + path + ' Error code: ' + err);
            return false
            // throw new Error('Path is not writable: ' + path + ' Error code: ' + err);
        }
    }

    fsOp.prototype.checkPathReadable = function checkPathReadable(path) {
        try {
            fs.accessSync(path, fs.R_OK);
            return true;
        } catch (err) {
            logger.error('Path is not readable: ' + path + ' Error code: ' + err);
            return false;
            // throw new Error('Path is not readable: ' + path + ' Error code: ' + err);
        }
    }

    fsOp.prototype.prepareWritableDir = function prepareWritableDir(path) {
        if (!fs.existsSync(path)) {
            this.mkdirSync(path, parseInt('0775', 8));
        } else {
            this.checkPathWritable(path);
        }
    }

    fsOp.prototype.downloadIso = function downloadIso(link, targetFile, callback) {
        assert.string(targetFile, 'target file');

        var wget = 'wget -O ' + targetFile + ' ' + link + ' 2>/dev/null';

        logger.info('downloading ' + link);

        var child = child_process.exec(wget, function (err, stdout, stderr) {
            var cb = callback || function () { };

            if (err) {
                cb(err);
            } else {
                cb();
            }
        });
    }

    fsOp.prototype.mountIso = function mountIso(isoPath, mountPath, callback) {
        this.prepareWritableDir(mountPath);

        logger.info('mounting ' + mountPath);

        var cb = callback || function () { };

        var mount = 'mount -o loop ' + isoPath + ' ' + mountPath;
        var child = child_process.exec(mount, function (err, stdout, stderr) {
            if (err) {
                // throw new Error('Error mount file from ' + isoPath
                //     + ' to ' + mountPath
                //     + ' ' + err);
                cb(err);
            } else {
                cb();
            }
        })
    }

    fsOp.prototype.unmountIso = function mountIso(mountPath, callback) {
        var umount = 'umount ' + mountPath;

        logger.info('unmountting ' + mountPath);

        var cb = callback || function () { };

        var child = child_process.exec(umount, function (err, stdout, stderr) {
            if (err) {
                logger.info('Error umount ' + mountPath + ' ' + err);
                cb(err);
            } else {
                cb();
            }
        })
    }

    fsOp.prototype.createSymbolLink = function createSymbolLink(
        source,
        dest,
        callback) {

        var cb = callback || function () { };

        logger.info('Creating symbol link from ' + source + ' to ' + dest);

        // create parent direct if it's not exists
        this.prepareWritableDir(path.join(dest, '../'));

        var ln = 'ln -sf ' + source + ' ' + dest;
        var child = child_process.exec(ln, function (err, stdout, stderr) {
            if (err) {
                cb(err);
            } else {
                cb();
            }
        })
    }

    fsOp.prototype.removeSymbolLink = function removeSymbolLink(
        link
    ) {
        try {
            logger.info('removing symbol link ' + link);
            fs.unlinkSync(link);
        } catch (err) {
            // continue anyway
        }
    }

    return new fsOp();
}