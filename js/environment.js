function EnvironmentManager() {

    var self = this;
    var environments = [];

    self.size = { height: 0, width: 0 };

    self.add_environment = function(environment) {

        environments.push(environment);

        var LR = {
            x: environment.pos.x + environment.size.width,
            y: environment.pos.y + environment.size.height
        };
        self.size = {
            width: Math.max(self.size.width, LR.x),
            height: Math.max(self.size.height, LR.y)
        };
    };

    self.update = function() {
        for (var i = 0; i < environments.length; i++) {
            var environment = environments[i];
            gfx.draw_image(environment.img, environment.pos, environment.size);
        }
    };
};