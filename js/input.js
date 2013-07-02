
// the input engine handles capturing and processing input, including sending
// messages to the game engine on how to handle the input
function InputEngine(canvas) {

    var self = this;
    self.keyState = new Array(256);
    self.mouseState = {
        mouseDown: false,
        pos: { x: 0, y: 0 }
    };

    // method for intercepting input, blocking other callbacks
    var intercepted = null;
    self.intercept = function(options) {

        if (intercepted) { return; }

        var
            capture = options.capture,
            release =
                options.release || function() { return !options.capture(); },
            callback = options.callback;

        if (capture()) {
            intercepted = function() {
                if (release()) return false;
                callback();
            };
            callback();
        }
    };
    self.update = function() {
        if (!intercepted) return;
        if (intercepted() === false) intercepted = null;
    }

    // test event listener, should move the character with a small offset
    // around the screen as you click. at the moment, the character is off
    // by a factor of about 2. i do not know why yet.
    canvas.addEventListener('mousedown', function(event) {
        self.mouseState.mouseDown = true;
    });
    canvas.addEventListener('mouseup', function(event) {
        self.mouseState.mouseDown = false;
    });
    canvas.addEventListener('mouseout', function(event) {
        self.mouseState.mouseDown = false;
    });
    canvas.addEventListener('mousemove', function(event) {
        self.mouseState.pos = get_pos_from_event(event);
    });
    canvas.addEventListener('keydown', function(event) {
        self.keyState[event.keyID] = true;
    });
    canvas.addEventListener('keyup', function(event) {
        self.keyState[event.keyID] = false;
    });
    canvas.addEventListener('dragstart', function(event) {
        self.mouseState.mouseDown = true;
    });
    canvas.addEventListener('dragend', function(event) {
        self.mouseState.mouseDown = false;
    });
    canvas.addEventListener('dragleave', function(event) {
        self.mouseState.mouseDown = false;
    })
    canvas.addEventListener('drag', function(event) {
        self.mouseState.pos = get_pos_from_event(event);
    });

    function get_pos_from_event(event) {
        return {
            x: event.clientX - canvas.offsetLeft,
            y: event.clientY - canvas.offsetTop
        };
    };
}