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

    FsOperation.prototype.getFileNameFromStrSync = function getFileNameFromStrSync(str) {
        var splited = str.split('/');
        if(splited.length > 0){
            return splited[splited.length - 1];
        } else {
            return '';
        }
    };

    FsOperation.prototype.getIsoNameFromStrSync = function getIsoNameFromStrSync(str) {
        var name = this.getFileNameFromStrSync(str);
        if (name.endsWith('.iso')) {
            return name;
        } else {
            throw new Error('ISO path should end with .iso');
        }
    };

    FsOperation.prototype.getIsoNameFromWebLinkSync =
        function getIsoNameFromWebLinkSync(osName, osVersion, link) {
            var iso = this.getIsoNameFromStrSync(link);
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

    FsOperation.prototype.checkPathWritableSync = function checkPathWritableSync(path) {
        try {
            fs.accessSync(path, fs.R_OK | fs.W_OK);
            return true;
        } catch (err) {
            logger.error('Path is not writable: ' + path + ' Error code: ' + err);
            throw new Error('Path is not writable: ' + path + ' Error code: ' + err);
        }
    };

    FsOperation.prototype.checkPathReadableSync = function checkPathReadableSync(path) {
        try {
            fs.accessSync(path, fs.R_OK);
            return true;
        } catch (err) {
            logger.error('Path is not readable: ' + path + ' Error code: ' + err);
            // throw new Error('Path is not readable: ' + path + ' Error code: ' + err);
            return false;
        }
    };

    FsOperation.prototype.prepareWritableDirSync = function prepareWritableDirSync(path) {
        if (fs.existsSync(path)) {
            this.checkPathWritableSync(path);
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
        this.prepareWritableDirSync(mountPath);

        logger.info('Mounting ' + mountPath);

        var mount = 'mount -o loop ' + isoPath + ' ' + mountPath;

        return this._PromisedChildProcess(mount);
    };

    FsOperation.prototype.unmountIso = function mountIso(mountPath) {
        var umount = 'umount ' + mountPath;

        logger.info('Unmountting ' + mountPath);

        return this._PromisedChildProcess(umount);
    };

    FsOperation.prototype.getAllMounts = function getAllMounts() {
        var listMount = 'df';

        return this._PromisedChildProcess(listMount);
    };

    FsOperation.prototype.unmountAllIso = function unmountIso() {
        var self = this;
        return this.getAllMounts()
            .then(function(cmdOutput){
                var mountLines = cmdOutput.stdout.split('\n');
                var mountDirectories = [];

                _.forEach(mountLines, function(mountLine){
                    if(mountLine.indexOf(process.cwd()) >= 0) {
                        var mountDirectory = mountLine.split(/\s+/)[5];
                        mountDirectories.push(mountDirectory);
                    }
                });

                return Promise.each(mountDirectories, function(mountDirectory){
                    return self.unmountIso(mountDirectory);
                });
            });
    };

    FsOperation.prototype.createSymbolLink = function createSymbolLink(
        source,
        dest) {
            logger.info('Creating symbol link to ' + dest);

            // create parent direct if it's not exists
            this.prepareWritableDirSync(path.join(dest, '../'));

            var ln = 'ln -sf ' + source + ' ' + dest;

            return this._PromisedChildProcess(ln);
    };

    FsOperation.prototype.removeDirSync = function removeDirSync(
        link
    ) {
        try {
            logger.info('Removing folder ' + link);
            fs.rmdirSync(link);
        } catch (err) {
            // non-critical error, continue anyway
            logger.info(JSON.stringify(err.message));
        }
    };

    FsOperation.prototype.removeParentDirSync = function removeParentDirSync(
        link
    ) {
        try {
            var parent = path.join(link, '../');

            if(_.isEmpty(fs.readdirSync(parent))){
                logger.info('Removing folder ' + parent);

                fs.rmdirSync(parent);
            }
        } catch (err) {
            // non-critical error, continue anyway
            logger.info(JSON.stringify(err.message));
        }
    };

    FsOperation.prototype.removeDirAndEmptyParentSync= function removeDirAndEmptyParentSync(
        link
    ) {
        this.removeDirSync(link);
        this.removeParentDirSync(link);
    };

    FsOperation.prototype.removeFile = function removeFile(
        link
    ) {
        return Promise.try(function(){
            logger.info('Removing file ' + link);
            fs.unlinkSync(link);
        });
    };

    FsOperation.prototype.getFileStatSync = function getFileStatSync(
        link
    ) {
        try {
            var stat = fs.statSync(link);
            return stat;
        } catch (err) {
            return new Error('file not found');
        }
    };

    FsOperation.prototype.getFileSizeSync = function getFileSizeSync(
        link
    ) {
        var stat = this.getFileStatSync(link);

        return stat['size'];
    };

    return new FsOperation();
}
