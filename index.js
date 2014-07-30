var debug  = require('debug')('pcm-cache-stream');
var Stream = require('stream');
var util   = require('util');
/**
 * Calculate the total length of the cached samples
 *
 * @private
 * @param   {Array}     cache
 */
function getCacheSize (cache) {
    var size   = 0;
    var i      = 0
    var length = cache.length;
    for (; i < length; i++) {
        size += cache[i].length;
    }
    return size;
}
/**
 * Create a Transform stream to pass through raw PCM data, while caching valid
 * samples based on a configurable amount of seconds.
 *
 * @param   {Object}    format
 */
var PCMCacheStream = function PCMCacheStream (format) {
    if (!(this instanceof PCMCacheStream)) {
        return new PCMCacheStream(format || {});
    }
    Stream.Transform.call(this);
    function defaults(name, value) {
        return format && format[name] ? format[name] : value;
    }
    this.settings = {
        'sampleRate'    : defaults('sampleRate',    44100),
        'bitDepth'      : defaults('bitDepth',      16),
        'channels'      : defaults('channels',      2),
        'cacheDuration' : defaults('cacheDuration', 3)
    };
    this.settings.blockAlign     = this.settings.bitDepth / 8 * this.settings.channels;
    this.settings.bytesPerSecond = this.settings.sampleRate * this.settings.blockAlign;
    this.settings.cacheSize      = this.settings.bytesPerSecond * this.settings.cacheDuration;
    // Fill cache with silence at first:
    var buffer = new Buffer(this.settings.cacheSize);
    buffer.fill(null)
    this.cache = [buffer];
    this.adjustCache();
    debug('Constructor', 'settings', this.settings);
};
util.inherits(PCMCacheStream, Stream.Transform);
/**
 * Intercept the pipe method so that we can write directly to the destination
 *
 * @public
 * @param   {Object}    destination
 * @param   {Object}    options
 */
PCMCacheStream.prototype.pipe = function (destination, options) {
    debug('pipe', destination.writable, options);
    var res = PCMCacheStream.super_.prototype.pipe.call(this, destination, options)
    if (destination.writable) {
        var i = 0;
        var length = this.cache.length;
        for (; i < length; i++) {
            destination.write(this.cache[i]);
        }
    }
    return res;
};
/**
 * Fix the cache to avoid invalid frames that might cause clicking or swap
 * audio channels. This logic comes from NodeFloyd
 *
 * @public
 */
PCMCacheStream.prototype.adjustCache = function adjustCache () {
    debug('adjustCache');
    var removed = 0;
    while (getCacheSize(this.cache) > this.settings.cacheSize) {
        removed += this.cache.shift().length;
    }
    var stillToRemove = removed % this.settings.blockAlign;
    while (stillToRemove > 0) {
        if (this.cache[0].length <= stillToRemove) {
            stillToRemove -= this.cache.shift().length;
        } else {
            this.cache[0] = this.cache[0].slice(stillToRemove);
            stillToRemove = 0;
        }
    }
};
/**
 * Re-adjust the cache, and pass the raw PCM data through
 *
 * @private
 * @param   {Object}    chunk
 * @param   {String}    encoding
 * @param   {Function}  callback
 */
PCMCacheStream.prototype._transform = function _transform (chunk, encoding, callback) {
    debug('_transform', chunk.length, encoding);
    this.cache.push(chunk);
    this.adjustCache();
    this.push(chunk);
    return callback.call(this);
};
module.exports = PCMCacheStream;
