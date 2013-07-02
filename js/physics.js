
// the physics engine is built on box2d and handles all of the physics
function PhysicsEngine() {

    var self = this;

    var world = new b2World(
        new b2Vec2(0,0),
        false
    );

    var listener = new b2ContactListener();
    listener.BeginContact = function(contact) {
        var bodyA = contact.GetFixtureA().GetBody();
        var bodyB = contact.GetFixtureB().GetBody();
        var entA = bodyA.GetUserData();
        var entB = bodyB.GetUserData();
        if (entA.id == entB.id) {
            contact.SetEnabled(false);
            return;z
        }
        if (entA.begin_touch) entA.begin_touch(bodyB);
        if (entB.begin_touch) entB.begin_touch(bodyA);
    };
    listener.EndContact = function(contact) {
        var bodyA = contact.GetFixtureA().GetBody();
        var bodyB = contact.GetFixtureB().GetBody();
        var entA = bodyA.GetUserData();
        var entB = bodyB.GetUserData();
        if (entA.id == entB.id) {
            contact.SetEnabled(false);
            return;
        }
        if (entA.end_touch) entA.end_touch(bodyB);
        if (entB.end_touch) entB.end_touch(bodyA);
    };

    // disable all physical contact
    listener.PreSolve = function(contact, impulse) {
        // var bodyA = contact.GetFixtureA().GetBody();
        // var bodyB = contact.GetFixtureB().GetBody();
        // var entA = bodyA.GetUserData();
        // var entB = bodyB.GetUserData();
        // if (entA.id == entB.id) {
        contact.SetEnabled(false);
        //     return;
        // }
        // if (entA.pre_touch) entA.pre_touch(bodyB);
        // if (entB.pre_touch) entB.pre_touch(bodyA);
    };
    listener.PostSolve = function(contact, impulse) {
        var bodyA = contact.GetFixtureA().GetBody();
        var bodyB = contact.GetFixtureB().GetBody();
        var entA = bodyA.GetUserData();
        var entB = bodyB.GetUserData();
        if (entA.id == entB.id) {
            contact.SetEnabled(false);
            return;
        }
        if (entA.post_touch) entA.post_touch(bodyB);
        if (entB.post_touch) entB.post_touch(bodyA);
    };
    world.SetContactListener(listener);

    self.update = function () { world.Step(1/60,1,1); };

    // group index filters for collision detection
    var filters = {
        player: -1,
        enemy: -2,
    };

    self.create_body = function(bodyDef) {
        var body = new b2BodyDef();
        body.id = bodyDef.id;
        body.type = b2Body['b2_' + bodyDef.type + 'Body'];
        body.position = bodyDef.pos;
        body.userData = bodyDef.userData;
        body = world.CreateBody(body);
        
        var filter = filters[(bodyDef.userData || {}).team];
        for (var i = 0; i < bodyDef.fixtures.length; i++) {
            var fixtureDef = bodyDef.fixtures[i];
            var fixture = new b2FixtureDef();
            if (fixtureDef.shape == 'box') {
                fixture.shape = new b2PolygonShape();
                fixture.shape.SetAsBox(
                    fixtureDef.size.width/2, 
                    fixtureDef.size.height/2
                );
                if (fixtureDef.sensor) fixtureDef.isSensor = true;
            } else if (fixtureDef.shape == 'circle') { 
                fixture.shape = new b2CircleShape();
                fixture.shape.SetRadius(fixtureDef.size); 
                if (fixtureDef.sensor) fixture.isSensor = true;
            }
            fixture.filter.groupIndex = filter;
            body.CreateFixture(fixture);
        }
        return body;  
    };

    self.destroy_body = function(body) { world.DestroyBody(body); };

};