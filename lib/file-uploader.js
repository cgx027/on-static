// Copyright 2016, EMC, Inc.

'use strict';

module.exports = FileUploaderFactory;

FileUploaderFactory.$provide = 'FileUploader';
FileUploaderFactory.$inject = [
    'assert',
    'fs'
];

/**
 * FileUploaderFactory returns a FileUploader instance.
 * @private
 */
function FileUploaderFactory(
    assert,
    fs
) {
    function FileUploader(dest) {
        this.dest = dest;
    }

    function initProgressObj(req){
        var contentLengthStr = req.headers['content-length'];
        var progressObj ={};

        progressObj.reportProgress = true;

        if (contentLengthStr) {
            progressObj.reportByPercentageOrBytes = 'percentage';
            progressObj.totoalFileSize = parseInt(contentLengthStr);
        } else{
            progressObj.reportByPercentageOrBytes = 'bytes';
        }

        progressObj.uploadedBytes = 0;
        progressObj.progress = 0;
        progressObj.lastProgress = 0;

        progressObj.reportIntervalPercentage = 10; //10 percent
        progressObj.reportIntervalBytes = 100000000; //100Mb

        progressObj.reportInterval = progressObj.reportByPercentageOrBytes === 'percentage'?
            progressObj.reportIntervalPercentage: progressObj.reportIntervalBytes;
        return progressObj;
    }

    function updateProgress(progressObj, data){
        progressObj.uploadedBytes += data.length;

        // progressObj.lastProgress = progressObj.progress;

        if (progressObj.reportByPercentageOrBytes === 'percentage') {
            progressObj.progress =
                parseInt((progressObj.uploadedBytes / progressObj.totoalFileSize) * 100);
        }
        else {
            progressObj.progress = progressObj.uploadedBytes;
        }

        return progressObj.progress;
    }

    function formatProgress(PercentageOrByte, progress) {
        var progressStr;

        if (PercentageOrByte === 'percentage') {
            progressStr = 'Uploaded ' + progress + ' %\n';
        } else {
            progressStr = '.';
        }

        return progressStr;
    }

    function sendProgress(res, progressObj){
        if(progressObj.reportProgress) {
            if((progressObj.progress - progressObj.lastProgress) >= progressObj.reportInterval){

                res.write(formatProgress(progressObj.reportByPercentageOrBytes, progressObj.progress));

                progressObj.lastProgress = progressObj.progress;
            }
        }
    }

    FileUploader.prototype.upload = function (req, res) {

        var progressObj = initProgressObj(req);

        var destinationFile = fs.createWriteStream(this.dest);
        req.pipe(destinationFile);

        return new Promise(function(resolve, reject){
            req.on('data', function (data) {
                updateProgress(progressObj, data);
                sendProgress(res, progressObj);
            });

            req.on('end', function () {
                if (progressObj.reportProgress) {
                    res.write('Upload finished! \n');
                }
                resolve();
            }).on('error', function(err) {
                reject(err);
            });
        });
    };

    return FileUploader;
}
