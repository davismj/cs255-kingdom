
// the graphics engine handles all images and drawing to the canvas
function GraphicsEngine(canvas) {

    var self = this;
    var ctx = canvas.getContext('2d');

    var viewport = { x: 0, y: 0 }; // need a way to specify an initial viewport

    // need a draw function that will take in an image name and draw position
    // and draw that function to the canvas
    self.draw_image = function(imgName, pos, size) {
        if (!size) { console.log(imgName + ': Size not specified.'); return; }
        assets.get(imgName, function(imgDef) {
            ctx.drawImage(imgDef.img,
                imgDef.pos.x, imgDef.pos.y,
                imgDef.size.width, imgDef.size.height,
                pos.x - viewport.x, pos.y - viewport.y,
                size.width, size.height
            );
        });
    };

    self.draw_path = function(path, style) {
        if (!path) { console.log('Error: No path specified in draw_path.'); return; }
        style = style || {};
        ctx.beginPath();
        for (var i = 0; i < path.length; i++) {
            var point = path[i];
            switch (point.type) {
                case 'draw':
                    ctx.lineTo(
                        point.x - viewport.x,
                        point.y - viewport.y
                    );
                case 'move':
                default:
                    ctx.moveTo(
                        point.x - viewport.x,
                        point.y - viewport.y
                    );
            }
        }
        ctx.lineWidth = style.thickness || 1;
        ctx.strokeStyle = style.color || 'black';
        ctx.stroke();
    };

    self.clear = function() {
        ctx.clearRect(0,0,800,800);
    };

    // drag variable for viewport handling
    var initPos;
    self.update_viewport = function() {
        input.intercept({
            capture: function() {
                return input.mouseState.mouseDown;
            },
            callback: function() {
                if (initPos) {
                    var dx = initPos.x - input.mouseState.pos.x;
                    var dy = initPos.y - input.mouseState.pos.y;
                    viewport.x = Math.max(
                        0,
                        Math.min(
                            environments.size.width - canvas.width,
                            viewport.x + dx
                        )
                    );
                    viewport.y = Math.max(
                        0,
                        Math.min(
                            environments.size.height - canvas.height,
                            viewport.y + dy
                        )
                    );
                }
                initPos = input.mouseState.pos;
            }
        });
        if (!input.mouseState.mouseDown) initPos = null;
    };
    self.viewport_offset = function(pos) {
        return {
            x: pos.x + viewport.x,
            y: pos.y + viewport.y
        }
    };
};
