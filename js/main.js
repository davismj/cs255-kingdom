// script file for loading everything

// load core engines
var input = new InputEngine(document.getElementById('game'));
var assets = new AssetManager();
var physics = new PhysicsEngine();
var environments = new EnvironmentManager();
var entities = new EntityManager();
var gfx = new GraphicsEngine(document.getElementById('game'));
var audio = new AudioEngine();

// main engine
var scenes;

// load example scene
load_scene('example', function(scene) {

    assets.load(scene.Files, function() {

        for (var i = 0; i < (scene.Environment || []).length; i++) {
            var environment = scene.Environment[i];
            environments.add_environment(environment);
        }

        for (var i = 0; i < (scene.Entities || []).length; i++) {
            var entity = scene.Entities[i];
            entities.create_entity(entity)
        }

        (function run(){
            gfx.clear();
            input.update();
            physics.update();
            environments.update();
            entities.update();
            gfx.update_viewport();
            if (entities.get_players().length == 0) {
                audio.disconnect();
                alert('game over!');
            }
            else requestAnimationFrame(run);
        })();
    });
});

function load_scene(name, callback) {

    if (scenes === undefined) {

        // get the scene from the scenes.json
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'assets/data/scenes.json', true);
        xhr.onload = function() {
            scenes = JSON.parse(xhr.responseText);
            callback(scenes[name])
        }
        xhr.send();
    }

    else { callback(scenes[name]); }
};

function game_over() { 
    alert('game over! you suck!');
};