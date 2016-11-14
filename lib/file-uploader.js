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

    function initProgressInfo(req){
        var contentLengthStr = req.headers['content-length'];
        var progressInfo ={};

        progressInfo.reportProgress = true;

        if (contentLengthStr) {
            progressInfo.reportByPercentageOrBytes = 'percentage';
            progressInfo.totoalFileSize = parseInt(contentLengthStr);
        } else{
            progressInfo.reportByPercentageOrBytes = 'bytes';
        }

        progressInfo.uploadedBytes = 0;
        progressInfo.progress = 0;
        progressInfo.lastProgress = 0;

        progressInfo.reportIntervalPercentage = 10; //10 percent
        progressInfo.reportIntervalBytes = 100000000; //100Mb

        progressInfo.reportInterval = progressInfo.reportByPercentageOrBytes === 'percentage'?
            progressInfo.reportIntervalPercentage: progressInfo.reportIntervalBytes;
        return progressInfo;
    }

    function updateProgress(progressInfo, data){
        progressInfo.uploadedBytes += data.length;

        // progressInfo.lastProgress = progressInfo.progress;

        if (progressInfo.reportByPercentageOrBytes === 'percentage') {
            progressInfo.progress =
                parseInt((progressInfo.uploadedBytes / progressInfo.totoalFileSize) * 100);
        }
        else {
            progressInfo.progress = progressInfo.uploadedBytes;
        }

        return progressInfo.progress;
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

    function sendProgressResp(res, progressInfo){
        if(progressInfo.reportProgress) {
            if((progressInfo.progress - progressInfo.lastProgress) >= progressInfo.reportInterval){

                res.write(
                    formatProgress(progressInfo.reportByPercentageOrBytes, progressInfo.progress)
                );

                progressInfo.lastProgress = progressInfo.progress;
            }
        }
    }

    FileUploader.prototype.upload = function (req, res) {

        var progressInfo = initProgressInfo(req);

        var destinationFile = fs.createWriteStream(this.dest);
        req.pipe(destinationFile);

        res.write('Start uploading file \n');
        logger.info('Start uploading file to ' + this.dest );

        return new Promise(function(resolve, reject){

            req.on('data', function (data) {
                updateProgress(progressInfo, data);
                sendProgressResp(res, progressInfo);
            });

            req.on('end', function () {
                if (progressInfo.reportProgress) {
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
