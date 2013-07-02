function EntityManager() {

    var self = this;

    // need a list of entities
    self.entities = [];

    var entityTypes = {
        default: SpriteEntity,
        sprite: SpriteEntity,
        character: CharacterEntity,
        player: PlayerEntity,
        enemy: EnemyEntity,
        vector: VectorEntity,
        path: PathEntity
    };
    var identity = 0;

    // need a create entity function, this will take a type and optionally
    // settings (for instantiating) the entity and returns a new entity
    self.create_entity = function(entity) {
        entity = entity || {};
        entity.id = ++identity;
        entity = new (entityTypes[entity.type || 'default'])(entity);
        self.entities.push(entity);
        return entity;
    };

    self.get_players = function() {
        var players = [];
        for (var i = 0; i < self.entities.length; i++) {
            if (self.entities[i] instanceof PlayerEntity)
                players.push(self.entities[i]);
        }
        return players;
    }

    self.update = function() {
        for (var i = 0; i < self.entities.length; i++) {
            self.entities[i].update();
        }
        for (var i = 0; i < self.entities.length; i++) {
            if (self.entities[i].destroyed) self.entities.splice(i--,1);
        }
    };

};

var SpriteEntity = Class.create({

    id: 0,
    pos: null,
    size: null,
    
    destroyed: false,

    defaultSprite: null,
    currentAnimation: null,

    animations: {},
    sfx: {},

    // general entity functions
    initialize: function(entity) {

        entity = entity || {}; // prevent undefined errors

        this.id = entity.id;
        this.pos = entity.pos || { x: 0, y: 0 };
        this.size = entity.size || { height: 0, width: 0 };

        this.sfx = {};

        this.draw();
    },
    update: function() { this.draw(); },
    draw: function() {

        var drawPos = {
            x: this.pos.x - this.size.width/2,
            y: this.pos.y - this.size.height/2
        };
        var drawSize = {
            height: this.size.height,
            width: this.size.width
        };

        var sprite;

        // if sprite is animating
        if (this.currentAnimation) {

            var anim = this.animations[this.currentAnimation.name];
            if (!anim) {
                console.log(
                    'Error: Animation ' 
                        + this.currentAnimation.name 
                        + ' not defined.'
                );
                return;
            }

            // advance the frame according to the speed
            this.currentAnimation.frame += 
                anim.length/(60 * this.currentAnimation.speed);
                
            // update the sprite
            if (this.currentAnimation.loop) 
                this.currentAnimation.frame %= anim.length;
            
            // if the animation has completed, stop animating
            if (this.currentAnimation.frame >= anim.length) 
                this.currentAnimation = null;
            // otherwise, select the correct sprite
            else sprite = anim[Math.floor(this.currentAnimation.frame)];
        }

        gfx.draw_image(sprite || this.defaultSprite, drawPos, drawSize);
    },
    destroy: function() { this.destroyed = true; },

    // specific entity functions
    animate: function(animationDef) {

        if (!animationDef) this.stop_animation();
        if (this.currentAnimation && !animationDef.override) return;

        var animation = typeof animationDef == 'string'
            ? animationDef 
            : animationDef.name;
        var speed = animationDef.speed || 1.0;
        var loop = animationDef.loop === false ? false : true;
        var frame = animationDef.frame || 0;

        if (!animation in this.animations) {
            console.log('Error: Invalid animation ' + animation + ' used.');
            return;
        }

        // don't do anything if calling the same animation
        if (this.currentAnimation && animation == this.currentAnimation.name)
            return;

        this.currentAnimation = {
            name: animation,
            speed: speed,
            loop: loop,
            frame: frame
        };
    },
    stop_animation: function() { 
        if (!this.currentAnimation) return;
        this.currentAnimation = null; 
    },
    play_sound: function(soundDef) { 
        if (!soundDef) return;
        var soundName = soundDef.name || soundDef;
        if (soundName in this.sfx) this.stop_sound(soundName);
        this.sfx[soundName] = audio.play_sound(soundDef);
    },
    stop_sound: function(soundName) { 
        var sound = this.sfx[soundName];    
        audio.stop_sound(sound);
    },
    playing: function(soundName) { 
        return (this.sfx[soundName] || {}).playbackState == 2;
    },
    clear_stopped_sfx: function() {
        for (soundName in this.sfx) {
            var sound = this.sfx[soundName];
            if (!sound) return;
            if (sound.playbackState > 2) { this.sfx[soundName] = null; }
        }
    }
});

var CharacterEntity = Class.create(SpriteEntity, {
    
    size: { height: 48, width: 32},
    body: null,
    
    stats: {
        health: 100,
        attack: 12,
        range: 25,
        attackSpeed: 1.5,
        defense: 10,
        speed: 20
    },
    team: null,
    target: null,
    inRange: {},

    attackPhase: null,

    // general entity functions
    initialize: function(entity) {
        
        entity = entity || {}; // prevent undefined errors

        this.id = entity.id;
        this.pos = entity.pos || { x: 0, y: 0 };
        this.sfx = {};
        this.stats = entity.stats ||
            {
                health: this.stats.health,
                attack: this.stats.attack,
                range: this.stats.range,
                attackSpeed: this.stats.attackSpeed,
                defense: this.stats.defense,
                speed: this.stats.speed
            }
        this.inRange = {};

        this.body = physics.create_body({
            id: this.id,
            pos: this.pos,
            type: 'dynamic',
            userData: this,
            fixtures: [{
                size: this.size,
                shape: 'box'
            },{
                size: entity.range || this.stats.range,
                shape: 'circle',
                sensor: true
            }]
        });

        this.draw();
    },
    update: function() {
       
        if (this.target && this.inRange[this.target])
            this.attack()
        
        // if the target has been destroyed
        if (this.target && this.target.destroyed) {
            this.target = null;
            this.attackPhase = null;
            this.stop_animation();
        }

        // if no health left, die
        if (this.stats.health <= 0) this.destroy();

        // clear stopped sfx
        this.clear_stopped_sfx();

        // update the position
        this.pos = this.body.GetPosition();

        this.draw();
    },
    destroy: function() {
        this.destroyed = true;
        this.stop_sound('sfx_move');
        physics.destroy_body(this.body);
    },

    // event callbacks
    begin_touch: function(otherBody) {
        
        var otherEntity = otherBody.GetUserData();

        // if this is targetable, add to inRange
        if (!this.team || this.team != otherEntity.team)
            this.inRange[otherEntity.id] = true;
    },
    end_touch: function(otherBody) { 

        var otherEntity = otherBody.GetUserData();

        // if this is targetable, remove from inRange
        if (!this.team || this.team != otherEntity.team)
            this.inRange[otherEntity.id] = false;
    },

    // specific entity functions
    on_attacked: function(otherEntity) {},
    take_damage: function(val) {
        
        switch(typeof val) {
            case "string":
                try {
                    val = parseFloat(
                        val
                            .match(/.+%/)[0]
                            .match(/[0-9]+\.?[0-9]*/)[0]
                    );
                    if (isNaN(val) || val < 0) throw "invalid value";
                }
                catch (error) {
                    console.log("Error: Invalid value passed to take_damage.");
                    return;
                }
                this.stats.health -= (this.health * val/100);
                break;
            case "number":
                if (val < 0) {
                    console.log("Error: Negative value passed to take_damage.");
                    return;
                }
                this.stats.health -= val;
                break;
        }

        this.animate({
            name: 'damaged',
            speed: 0.2,
            loop: false,
            override: true
        });
    },
    attack: function() {

        // if first attack, start attacking and stop moving
        if (!this.attackPhase) {
            this.attackPhase = 1.0;
            this.body.SetLinearVelocity(new b2Vec2(0,0));
            this.stop_animation();
            this.stop_sound('sfx_move');
        }

        // trigger the animation
        this.animate({
            name: 'attack',
            speed: (1/this.stats.attackSpeed),
            frame: (1-this.attackPhase) * this.animations['attack'].length
        });

        // if its time to attack
        if (this.attackPhase <= 0) {

            this.play_sound('sfx_attack');

            // attack
            if (!this.target.stats || !this.target.stats.defense)
                this.target.take_damage('100%');
            else { 
                var mod = this.stats.attack - this.target.stats.defense;
                if (mod > 0)
                    this.target.take_damage(10 + Math.pow(mod,2));
                else 
                    this.target.take_damage(10);
            }

            // and reset attackPhase
            this.attackPhase = 1.0;

        // otherwise, advance the attack phase
        } else {
            this.attackPhase -= this.stats.attackSpeed / 60;
        }

        // on attack, notify the other target of an attack
        this.target.on_attacked(this);
    }
});

var PlayerEntity = Class.create(CharacterEntity, {

    path: null,
    stats: {
        health: 300,
        attack: 1,
        range: 30,
        attackSpeed: 1.5,
        defense: 12,
        speed: 120
    },
    team: 'player',

    defaultSprite: 'player_standing',
    animations: {
        damaged: ['player_damaged', 'player_standing'],
        move: ['player_walking', 'player_standing'],
        attack:
        [
        'player_standing',
        'player_attacking_01',
        'player_attacking_02',
        'player_attacking_03',
        'player_attacking_04'
        ]
    },

    // general entity functions
    update: function() {

        var self = this;

        // create path when clicked
        input.intercept({
            capture: function() {

                if (input.mouseState.mouseDown) {
                    var pos = gfx.viewport_offset(input.mouseState.pos);
                    var dx = Math.abs(pos.x - self.pos.x);
                    var dy = Math.abs(pos.y - self.pos.y);

                    // if the input is captured
                    if (dx < self.size.width/2 && dy < self.size.height/2) {
                        
                        // remove the current targret and path
                        if (self.target) self.target = null;
                        if (self.path) self.destroy_path();
                        self.path = entities.create_entity({
                            type: "path",
                            path: [{ x: self.pos.x, y: self.pos.y }]
                        });
                        return true;
                    }
                }
            },
            release: function() {

                // if the input is released
                if (!input.mouseState.mouseDown) {

                    for (var i = 0; i < entities.entities.length; i++) {
                        
                        var entity = entities.entities[i];
                        if (entity.team === undefined) continue;
                        if (entity.team == self.team) continue;
                        
                        var pos = gfx.viewport_offset(input.mouseState.pos),
                            dx = Math.abs(pos.x - entity.pos.x),
                            dy = Math.abs(pos.y - entity.pos.y);

                        // on an enemy
                        if (dx < entity.size.width/2 && dy < entity.size.height/2) {
                            
                            // set the enemy as the current target
                            self.target = entity;
                            break;
                        }
                    }

                    self.play_sound('sfx_move');
                    return true;
                }
            },
            callback: function() {
                if (!self.path) console.log('Warning: Entity has no path.');
            }
        });

        // if target
        if (this.target) {

            // if in range, stop moving, start hitting
            if (this.inRange[this.target.id]) {
                this.destroy_path();
                this.attack();
            
            // if not in range, start chasing
            } else if(!this.path) {

                self.path = entities.create_entity({
                    type: "path",
                    path: [{ 
                        x: self.pos.x, 
                        y: self.pos.y
                    },{
                        x: this.target.pos.x,
                        y: this.target.pos.y
                    }]
                });

                if (this.attackPhase) {

                    // calculate the distance squared
                    var dx = 
                        Math.abs(this.pos.x - this.target.pos.x) 
                        - this.size.width/2,
                        dy =
                        Math.abs(this.pos.y - this.target.pos.y)
                        - this.target.size.height/2,
                        dist = Math.max(dx*dx, 0) + Math.max(dy*dy, 0);

                    // if the distance greater than 1.5 of the range
                    if (dist > Math.pow(this.stats.range * 1.5, 2)) {
                    
                        // stop attacking and start chasing
                        this.attackPhase = null;
                    }
                }
            }
        }

        // if a path present
        if (this.path) {

            // if a target, set the endpoint to the targets position
            if (this.target) {
                this.path.path[1] = this.target.pos;
                this.path.style.color = 'red';
            }

            if (this.path.path[1]) {

                this.animate({ 
                    name: 'move',
                    speed: 0.3,
                    override: true
                });

                // follow it
                var dir = new b2Vec2(
                    this.path.path[1].x - this.pos.x,
                    this.path.path[1].y - this.pos.y
                );
                dir.Normalize();
                dir.Multiply(this.stats.speed);
                this.body.SetLinearVelocity(dir);

                // shorten it as you go
                this.path.path[0].x = this.pos.x;
                this.path.path[0].y = this.pos.y;

                // quit when traversed
                if (Math.pow(this.pos.x - this.path.path[1].x, 2) +
                    Math.pow(this.pos.y - this.path.path[1].y, 2) < 1.0) {
                    this.body.SetLinearVelocity(new b2Vec2(0,0))
                    this.destroy_path();
                }
            }
        }
        
        // if the target has been destroyed
        if (this.target && this.target.destroyed) {
            this.target = null;
            this.attackPhase = null;
            this.stop_animation();
            this.destroy_path();
        }

        // if no health left, die
        if (this.stats.health <= 0) this.destroy();

        // clear stopped sfx
        this.clear_stopped_sfx();

        // update the position
        this.pos = this.body.GetPosition();

        this.draw();
    },
    destroy: function() {
        this.destroyed = true;
        this.destroy_path();
        this.stop_sound('sfx_move');
        this.play_sound('sfx_die');
        physics.destroy_body(this.body);
    },

    // specific entity functions
    destroy_path: function() {
        if (!this.path) return;
        this.path.destroy(); 
        this.path = null;
        this.body.SetLinearVelocity(new b2Vec2(0,0));
        this.stop_sound('sfx_move');
        this.stop_animation();
    },
});

var EnemyEntity = Class.create(CharacterEntity, { 
    
    team: 'enemy',

    defaultSprite: 'enemy_standing',
    animations: {
        damaged: ['enemy_damaged', 'enemy_standing'],
        move: ['enemy_walking', 'enemy_standing'],
        attack:
        [
        'enemy_standing',
        'enemy_attacking_01',
        'enemy_attacking_02',
        'enemy_attacking_03',
        'enemy_attacking_04'
        ]
    },



    // general entity functions
    update: function() {
        
        var self = this;

        // if target, verify it isn't much less attractive
        if (this.target) {
            if (!this.target.weight) {
                console.log('Warning: Unweighted target selected.')
                this.target.weight = player_weight(this.target);
            }
            if (1.5 * this.target.weight < player_weight(this.target))
                this.target = null;
        }

        // if no target, acquire a target
        if (!this.target) {
            
            var minWeight = Infinity;
            var minPlayer = null;

            // for each player entity
            for (var i = entities.entities.length-1; i >= 0; i--) {

                var player = entities.entities[i];
                if (player.team != 'player') continue;

                // calculate the weight
                var playerWeight = player_weight(player);
                
                // and store the minimum
                if (playerWeight < minWeight) {
                    minWeight = playerWeight;
                    minPlayer = player;
                }
            }

            if (minPlayer) {
                minPlayer.weight = minWeight;
                this.target = minPlayer;
            }
        }

        if (this.target) {

            // if target in range, attack
            if (this.inRange[this.target.id])
                this.attack();

            // otherwise, stop attacking and pursue
            else {
                if (this.attackPhase) {
                    this.attackPhase = null;
                    this.stop_animation();
                }
                var dir = new b2Vec2(
                    this.target.pos.x - this.pos.x, 
                    this.target.pos.y - this.pos.y
                );
                dir.Normalize();
                dir.Multiply(this.stats.speed);
                this.body.SetLinearVelocity(dir);
                this.animate({
                    name: 'move',
                    speed: 0.3
                });
                if (!this.playing('sfx_move')) {
                    this.play_sound('sfx_move');
                }
            }

        // stop moving
        } else {
            this.body.SetLinearVelocity(new b2Vec2(0,0));
            this.stop_animation();
            this.stop_sound('sfx_move');
        }
               
        // if the target has been destroyed
        if (this.target && this.target.destroyed) {
            this.target = null;
            this.attackPhase = null;
            this.stop_animation();
        }

        // if no health left, die
        if (this.stats.health <= 0) this.destroy();

        // clear stopped sfx
        this.clear_stopped_sfx();

        // update the position
        this.pos = this.body.GetPosition();

        this.draw();

        function player_weight(player) {

            // distance weight is linear
            var distance = 
                Math.pow(self.pos.x - player.pos.x, 2)
                + Math.pow(self.pos.y - player.pos.y, 2)

            // max range of 200 px;
            if (distance > 40000) return Infinity

            // low health weight is quadratic
            var health = 
                Math.pow(player.stats.health/(Math.max(self.stats.health,1)), 4);

            return distance + health;
        }
    },

    // specific entity functions
    on_attacked: function(otherEntity) {
        this.target = otherEntity;
    }
});

// THESE ARE NOT ENTITIES. THEY SHOULD BE MOVED TO AN INTERFACE CLASS //
var VectorEntity = Class.create({

    id: 0,
    path: null,
    style: null,
    destroyed: false,

    initialize: function(entity) {

        entity = entity || {};

        this.id = entity.id;
        this.path = entity.path;
        this.style = entity.style || { color: null, thickness: null };

        this.draw();
    },
    update: function() { this.draw(); },
    draw: function() { gfx.draw_path(this.path, this.style); },
    destroy: function() { this.destroyed = true; }
});

var PathEntity = Class.create(VectorEntity, {

    update: function() {
        if (!this.path[1] && !input.mouseState.mouseDown) {
            this.path[1] = gfx.viewport_offset(input.mouseState.pos);
            this.path[1].type = 'draw';
        }
        this.draw();
    },
    draw: function() {
        // set second point or default
        var path = this.path.slice();
        var style = { 
            color: this.style.color, 
            thickness: this.style.thickness 
        };
        if (!style.color) style.color = path.length == 2 ? 'green' : 'black';
        style.thickness = style.thickness || 2;
        path[1] = path[1] || gfx.viewport_offset(input.mouseState.pos);
        path[1].type = 'draw';
        gfx.draw_path(path, style);
    }
});
