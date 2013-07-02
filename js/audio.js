
function AudioEngine() {

    var self = this;
    var gain = 2.0;
    var clips = [];

    var context = new webkitAudioContext();
    var mainNode = context.createGainNode(0);
    mainNode.connect(context.destination);

    self.play_sound = function(soundDef, entityId) {

        if (!soundDef) return;
        var soundName = soundDef.name || soundDef,
            source = context.createBufferSource();

        assets.get(soundName, function(sound) {

            if (!sound) {
                console.log('Error: Sound ' + soundName + ' not found.');
                return;
            }

            var start = sound.start;
            var length = sound.length;
            var end = soundDef.end;

            source.buffer = sound.buffer;
            source.gain.value = gain * (soundDef.volume || sound.volume);
            source.loop = soundDef.loop || sound.loop;
            source.loopStart = sound.start;
            source.loopEnd = sound.start + sound.length || undefined;
            source.onended = function() { console.log('onended fired'); };
            source.connect(mainNode);
            source.start(0, sound.start, sound.length);
        });

        return source;
    }; 
    self.stop_sound = function(sound) { 
        if (sound) sound.stop(0); 
    };

    self.set_volume = function(volume) { this.mainNode.gain.value = volume; };
    self.disconnect = function() { mainNode.disconnect(0); };

    self.decode_audio = function(data, callback) { 
        context.decodeAudioData(data, callback); 
    };

};