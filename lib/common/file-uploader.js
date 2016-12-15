// Copyright 2016, EMC, Inc.

'use strict';

module.exports = FileUploaderFactory;

FileUploaderFactory.$provide = 'FileUploader';
FileUploaderFactory.$inject = [
    'assert',
    'fs',
    'Logger'
];

/**
 * FileUploaderFactory returns a FileUploader instance.
 * @private
 */
function FileUploaderFactory(
    assert,
    fs,
    Logger
) {
    var logger = Logger.initialize("FileUploader");

    function FileUploader(dest) {
        this.dest = dest;
    }

    FileUploader.prototype.upload = function (req, res) {

        var destinationFile = fs.createWriteStream(this.dest);

        logger.info('Start uploading file to ' + this.dest );

        return new Promise(function(resolve, reject){

            req.pipe(destinationFile);

            req.on('data', function (data) {
                // place holder, do nothing for now
            });

            req.on('end', function () {
                resolve();
            });

            req.on('error', function(err) {
                reject(err);
            });
        });
    };

    return FileUploader;
}
