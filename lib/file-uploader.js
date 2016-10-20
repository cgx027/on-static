// Copyright 2016, EMC, Inc.

'use strict';

module.exports = FileUploaderFactory;

FileUploaderFactory.$provide = 'FileUploader';
FileUploaderFactory.$inject = [
    'assert',
    'fs',
    '_'
];

/**
 * FileUploaderFactory returns a FileUploader instance.
 * @private
 */
function FileUploaderFactory(
    assert,
    fs,
    _
) {
    function FileUploader(dest) {
        this.dest = dest;
    }

    FileUploader.prototype.middleware = function (req, res, callback) {
        var contentLengthStr = req.headers['content-length'];
        var reportProgress = false;
        var cb = callback || function () { };

        if (contentLengthStr) {
            reportProgress = true;
            var uploadProgress = 0;
            var totoalFileSize = parseInt(contentLengthStr);
        }

        var uploadedBytes = 0;
        var lastMileStone = 0;

        var destinationFile = fs.createWriteStream(this.dest);
        req.pipe(destinationFile);

        req.on('data', function (data) {
            uploadedBytes += data.length;
            if (reportProgress) {
                var progressStr;
                uploadProgress = parseInt((uploadedBytes / totoalFileSize) * 100);

                // only report 10x percentages, like 10%, 20%
                var mileStone = parseInt(uploadProgress / 10);
                if (mileStone !== lastMileStone) {
                    progressStr = 'Uploaded ' + uploadProgress + ' %\n';
                    // progressStr = 'Uploaded ' + uploadedBytes.toString() + ' Bytes \n';
                    res.write(progressStr);
                    lastMileStone = mileStone;
                }
            }
            else {
                // report a . every 10MB uploaded
                var mileStone = parseInt(uploadedBytes / 10000000);
                if (mileStone !== lastMileStone) {
                    res.write('.');
                    lastMileStone = mileStone;
                }
            }
        });
        req.on('end', function () {
            if (reportProgress) {
                res.write('Upload finished! \n');
            }
            cb();
        });
    };
    return FileUploader;
}
