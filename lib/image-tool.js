// Copyright 2016, EMC, Inc.

'use strict';

module.exports = imageToolFactory;

imageToolFactory.$provide = 'image-tool';
imageToolFactory.$inject = [
    'assert',
    'uuid',
    'Services.Inventory',
    '_'
];

/**
 * imageToolFactory returns a ImageTool instance.
 * @private
 */
function imageToolFactory(
    assert,
    uuid,
    inventory,
    _
) {
    function ImageTool() {
    }

    ImageTool.prototype.getAllImages = function () {
        return inventory.getAllImages();
    };

    ImageTool.prototype.createImage = function (iso, name, version) {
        var image = {};
        image.id = uuid.v4();
        image.iso = iso;
        image.name = name;
        image.version = version;
        image.status = 'not ready'

        return inventory.addImage(image)
    };

    ImageTool.prototype.deleteImage = function (name, version) {
        return inventory.deleteImageByNameVersion(name, version);
    };

    return new ImageTool();
}