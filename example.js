var PCMCacheStream = require('./index');
var Throttle       = require('throttle');
var Speaker        = require('speaker');
var devnull        = require('dev-null');
var format         = {
    'sampleRate'    : 44100,
    'bitDepth'      : 16,
    'channels'      : 2,
    'signed'        : true,
    'cacheDuration' : 3
};
var speaker = new Speaker(format);
var cache   = new PCMCacheStream(format);

// Read raw PCM data from stdin, and throttle at a constant rate
process.stdin
    .pipe(new Throttle(format.sampleRate * (format.bitDepth / 8 * format.channels)))
    .pipe(cache)
    .pipe(devnull());

// The stream starts with a pre-filled cache buffer, so if we pipe immediately
// we can expect leading silence
setTimeout(function () {
    cache.pipe(speaker);
}, 2 * 1000);
