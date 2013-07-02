
// The asset manager handles loading, storing, and indexing asset files
function AssetManager() {

    var self = this;

    // dictionary of assets
    var assets = {}

    // need a function that will take a source url, load the asset, store it
    // in a dictionary, and pass the loaded asset to the callback
    self.load = function(asset, callback) {

        // if a list, process entire list
        if (asset.length) {
            var count = asset.length;
            for (var i = count-1; i >= 0; i--) {
                self.load(asset[i], function() {
                   if (--count == 0) callback();
                });
            }
        }

        else {

            // parse the type of asset
            switch (getFileType(asset.src)) {

                case 'image':
                    var img = new Image();
                    img.onload = function() {

                        // if single image
                        if (!asset.assets) {
                            assets[asset.name] = {
                                img: img,
                                pos: { x: 0, y: 0 },
                                size: { height: img.height, width: img.width }
                            }
                            callback(img);
                            return;

                        // if multiple images
                        } else {

                            // for each contained image
                            for (var i = asset.assets.length-1; i >= 0; i--) {
                                var ast = asset.assets[i];

                                // store the image in assets
                                assets[ast.name] = {
                                    img: img,
                                    pos: ast.pos,
                                    size: ast.size
                                };
                            }
                            callback(img);
                        }
                    }
                    img.src = asset.src;
                    break;

                case 'audio':

                    var request = new XMLHttpRequest();
                    request.open('GET', asset.src, true);
                    request.responseType = 'arraybuffer';
                    request.onload = function() {

                        audio.decode_audio(request.response, function(buffer) {

                            // if single track
                            if (!asset.assets) {

                                assets[asset.name] = {
                                    buffer: buffer,
                                    volume: asset.volume || 1.0,
                                    loop: asset.loop || false
                                }

                            } else {

                                // if multiple track
                                for (var i = 0; i < asset.assets.length; i++) {

                                    // store the audio
                                    var ast = asset.assets[i];
                                    assets[ast.name] = {
                                        buffer: buffer,
                                        start: ast.start,
                                        length: ast.length,
                                        volume: ast.volume || 1.0,
                                        loop: ast.loop || false
                                    };
                                }
                            }

                            callback(buffer);
                        });
                    };
                    request.send();
                    break;

                default:
                    return;
            }

        }

        function getFileType(filename) {
            if (filename.search('.png') > -1) return 'image';
            if (filename.search('.ogg') > -1) return 'audio';
        }
    }

    // originally looked for cached assets and loaded uncached assets if 
    // required; now, loads only cached assets, since it is unreasonable 
    // to assume that every reference to any asset would contain the image
    // information, such as source size and position
    self.get = function(assetName, callback) {

        var asset = assets[assetName];
        // if (asset === undefined) self.load(assetName, callback);
        if (asset === undefined) 
            console.log('Error: Uncached asset ' + assetName + ' used.');
        else callback(asset);
    };
}
