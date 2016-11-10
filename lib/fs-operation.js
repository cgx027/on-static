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

    FsOperation.prototype.getFileNameFromStr = function getFileNameFromStr(str) {
        var splited = str.split('/');
        if(splited.length > 0){
            return splited[splited.length - 1];
        } else {
            return '';
        }
    };

    FsOperation.prototype.getIsoNameFromStr = function getIsoNameFromStr(str) {
        var name = this.getFileNameFromStr(str);
        if (name.endsWith('.iso')) {
            return name;
        } else {
            throw new Errors.BadRequestError('ISO path should end with .iso');
        }
    };

    FsOperation.prototype.getIsoNameFromWebLink =
        function getIsoNameFromWebLink(osName, osVersion, link) {
            var iso = this.getIsoNameFromStr(link);
            return iso? iso: osName + '-' + osVersion;
        };

    FsOperation.prototype.mkdirSync = function mkdirSync(path) {
        try {
            // fs.mkdirSync(path);
            logger.info('Creating folder: ' + path);
            mkdirp.sync(path);
        } catch (err) {
            logger.error('Error creating folder ' + path + ' Error code: ' + err);
            throw new Error('Error creating folder ' + path + ' Error code: ' + err);
        }
    };

    FsOperation.prototype.checkPathWritable = function checkPathWritable(path) {
        try {
            fs.accessSync(path, fs.R_OK | fs.W_OK);
            return true;
        } catch (err) {
            logger.error('Path is not writable: ' + path + ' Error code: ' + err);
            throw new Error('Path is not writable: ' + path + ' Error code: ' + err);
        }
    };

    FsOperation.prototype.checkPathReadable = function checkPathReadable(path) {
        try {
            fs.accessSync(path, fs.R_OK);
            return true;
        } catch (err) {
            logger.error('Path is not readable: ' + path + ' Error code: ' + err);
            throw new Error('Path is not readable: ' + path + ' Error code: ' + err);
        }
    };

    FsOperation.prototype.prepareWritableDir = function prepareWritableDir(path) {
        if (fs.existsSync(path)) {
            this.checkPathWritable(path);
        } else {
            this.mkdirSync(path, parseInt('0775', 8));
        }
    };

    FsOperation.prototype.downloadIso = function downloadIso(link, targetFile) {
        assert.string(targetFile, 'target file');

        var wget = 'wget -O ' + targetFile + ' ' + link + ' 2>/dev/null';

        logger.info('Downloading ' + link);

        return this._PromisedChildProcess(wget);
    };

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

        logger.info('Mounting ' + mountPath);

        var mount = 'mount -o loop ' + isoPath + ' ' + mountPath;

        return this._PromisedChildProcess(mount);
    };

    FsOperation.prototype.unmountIso = function mountIso(mountPath) {
        var umount = 'umount ' + mountPath;

        logger.info('Unmountting ' + mountPath);

        return this._PromisedChildProcess(umount)
            .catch(function(){
                return Promise.resolve();
            });
    };

    FsOperation.prototype.createSymbolLink = function createSymbolLink(
        source,
        dest) {
            logger.info('Creating symbol link to ' + dest);

            // create parent direct if it's not exists
            this.prepareWritableDir(path.join(dest, '../'));

            var ln = 'ln -sf ' + source + ' ' + dest;

            return this._PromisedChildProcess(ln);
    };

    FsOperation.prototype.removeDir = function removeDir(
        link
    ) {
        try {
            logger.info('Removing folder ' + link);
            fs.rmdirSync(link);
        } catch (err) {
            // continue anyway
            logger.info(JSON.stringify(err.message));
        }
    };

    FsOperation.prototype.removeParentDir = function removeParentDir(
        link
    ) {
        try {
            var parent = path.join(link, '../');

            if(_.isEmpty(fs.readdirSync(parent))){
                logger.info('Removing folder ' + parent);

                fs.rmdirSync(parent);
            }
        } catch (err) {
            // continue anyway
            logger.info(JSON.stringify(err.message));
        }
    };

    FsOperation.prototype.removeDirAndEmptyParent= function removeDirAndEmptyParent(
        link
    ) {
        this.removeDir(link);
        this.removeParentDir(link);
    };

    FsOperation.prototype.removeFile = function removeFile(
        link
    ) {
        try {
            logger.info('Removing file ' + link);
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
