var Throttle = require('throttle');
var format = {
    'sampleRate'   : 44100,
    'bitDepth'     : 16,
    'channels'     : 2,
    'signed'       : true,
    'cacheSeconds' : 3
};
var speaker = require('speaker')(format);
var PCMCacheStream = require('./index')(format);
// Read raw PCM data from stdin, and throttle at a constant rate
process.stdin
    .pipe(new Throttle(format.sampleRate * (format.bitDepth / 8 * format.channels)))
    .pipe(PCMCacheStream)
    .on('data', function (chunk) {
        console.log('Stream read', chunk.length);
        // Switch off flowing mode to emulate real time playback
    })

// We're not going to start piping audio until 5 seconds have passed
setTimeout(function () {
    // However, before we start piping, we write the 5 seconds of cached data
    PCMCacheStream.writeCacheData(speaker);
    PCMCacheStream.on('data', function (chunk) {
        speaker.write(chunk);
    });
}, 3 * 1000);
