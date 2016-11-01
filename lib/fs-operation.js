// Copyright 2016, EMC, Inc.

'use strict';

module.exports = FsOperationFactory;

FsOperationFactory.$provide = 'fs-operation';
FsOperationFactory.$inject = [
    'assert',
    'Logger',
    'fs',
    'path',
    'mkdirp',
    'child_process',
    'Promise',
    '_'
];

/**
 * FsOperationFactory returns a FsOperation instance.
 * @private
 */
function FsOperationFactory(
    assert,
    Logger,
    fs,
    path,
    mkdirp,
    childProcess,
    Promise,
    _
) {
    var logger = Logger.initialize("fs-op");

    function FsOperation() {
    }

    FsOperation.prototype.mkdirSync = function mkdirSync(path) {
        try {
            // fs.mkdirSync(path);
            logger.info('creating folder: ' + path);
            mkdirp.sync(path);
        } catch (err) {
            logger.error('Error creating folder ' + path + ' Error code: ' + err);
            // throw new Error('Error creating folder ' + path + ' Error code: ' + err);
        }
    };

    FsOperation.prototype.checkPathWritable = function checkPathWritable(path) {
        try {
            fs.accessSync(path, fs.R_OK | fs.W_OK);
            return true;
        } catch (err) {
            logger.error('Path is not writable: ' + path + ' Error code: ' + err);
            return false;
            // throw new Error('Path is not writable: ' + path + ' Error code: ' + err);
        }
    };

    FsOperation.prototype.checkPathReadable = function checkPathReadable(path) {
        try {
            fs.accessSync(path, fs.R_OK);
            return true;
        } catch (err) {
            logger.error('Path is not readable: ' + path + ' Error code: ' + err);
            return false;
            // throw new Error('Path is not readable: ' + path + ' Error code: ' + err);
        }
    };

    FsOperation.prototype.prepareWritableDir = function prepareWritableDir(path) {
        if (!fs.existsSync(path)) {
            this.mkdirSync(path, parseInt('0775', 8));
        } else {
            this.checkPathWritable(path);
        }
    };

    FsOperation.prototype.downloadIso = function downloadIso(link, targetFile) {
        assert.string(targetFile, 'target file');

        var wget = 'wget -O ' + targetFile + ' ' + link + ' 2>/dev/null';

        logger.info('downloading ' + link);

        return this._PromisedChildProcess(wget);
    };

    // FsOperation.prototype.mountIso = function mountIso(isoPath, mountPath, callback) {
    //     this.prepareWritableDir(mountPath);
    //
    //     logger.info('mounting ' + mountPath);
    //
    //     var cb = callback || function () { };
    //
    //     var mount = 'mount -o loop ' + isoPath + ' ' + mountPath;
    //     var child = childProcess.exec(mount, function (err, stdout, stderr) {
    //         if (err) {
    //             cb(err);
    //         } else {
    //             cb();
    //         }
    //     })
    // }

    FsOperation.prototype._PromisedChildProcess = function PromisedChildProcess(command){

        return new Promise(function(resolve, reject){
            return childProcess.exec(command, function (err, stdout, stderr) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        stdout: stdout,
                        stderr: stderr
                    });
                }
            });

        });
    };

    FsOperation.prototype.mountIso = function mountIso(isoPath, mountPath) {
        this.prepareWritableDir(mountPath);

        logger.info('mounting ' + mountPath);

        var mount = 'mount -o loop ' + isoPath + ' ' + mountPath;

        return this._PromisedChildProcess(mount);
    };

    // FsOperation.prototype.unmountIso = function mountIso(mountPath, callback) {
    //     var umount = 'umount ' + mountPath;
    //
    //     logger.info('unmountting ' + mountPath);
    //
    //     var cb = callback || function () { };
    //
    //     var child = childProcess.exec(umount, function (err, stdout, stderr) {
    //         if (err) {
    //             // logger.info('Error umount ' + mountPath + ' ' + err);
    //             cb(err);
    //         } else {
    //             cb();
    //         }
    //     })
    // }

    FsOperation.prototype.unmountIso = function mountIso(mountPath) {
        var umount = 'umount ' + mountPath;

        logger.info('unmountting ' + mountPath);

        return this._PromisedChildProcess(umount);
    };

    // FsOperation.prototype.createSymbolLink = function createSymbolLink(
    //     source,
    //     dest,
    //     callback) {
    //
    //         var cb = callback || function () { };
    //
    //         logger.info('Creating symbol link from to ' + dest);
    //
    //         // create parent direct if it's not exists
    //         this.prepareWritableDir(path.join(dest, '../'));
    //
    //         var ln = 'ln -sf ' + source + ' ' + dest;
    //         var child = childProcess.exec(ln, function (err, stdout, stderr) {
    //             if (err) {
    //                 cb(err);
    //             } else {
    //                 cb();
    //             }
    //         })
    // }

    FsOperation.prototype.removeFile = function removeFile(
        link
    ) {
        try {
            logger.info('removing file ' + link);
            fs.unlinkSync(link);
        } catch (err) {
            // continue anyway
            logger.info(JSON.stringify(err.message));
        }
    };

    FsOperation.prototype.getFileStat = function getFileStat(
        link
    ) {
        try {
            var stat = fs.statSync(link);
            return stat;
        } catch (err) {
            return {};
        }
    };

    return new FsOperation();
}
