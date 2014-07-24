var debug  = require('debug')('pcm-cache-stream');
var Stream = require('stream')
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
        return new PCMCacheStream(format);
    }
    Stream.Transform.call(this, format || {});
    function defaults(name, value) {
        return format && format[name] ? format[name] : value;
    }
    this.cache    = [];
    this.settings = {
        'sampleRate'   : defaults('sampleRate',   44100),
        'bitDepth'     : defaults('bitDepth',     16),
        'channels'     : defaults('channels',     2),
        'cacheSeconds' : defaults('cacheSeconds', 3)
    };
    this.settings.blockAlign     = this.settings.bitDepth / 8 * this.settings.channels;
    this.settings.bytesPerSecond = this.settings.sampleRate * this.settings.blockAlign;
    this.settings.cacheSize      = this.settings.bytesPerSecond * this.settings.cacheSeconds;
    debug('Constructor', 'settings', this.settings);
};
util.inherits(PCMCacheStream, Stream.Transform);
module.exports = PCMCacheStream;
/**
 * Write the current cache to a Writable stream
 *
 * @public
 * @param   {Writable}  receiver
 */
PCMCacheStream.prototype.writeCacheData = function writeCacheData (receiver) {
    debug('writeCacheData', 'receiver writable', receiver.writable);
    debug('writeCacheData', 'chunks to write', this.cache.length);
    if (receiver && receiver.writable) {
        var i = 0;
        var length = this.cache.length;
        for (; i < length; i++) {
            receiver.write(this.cache[i]);
        }
    }
}
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
    this.push(chunk);
    this.cache.push(chunk);
    // Shamelessly lifted from nodefloyd
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
    return callback.call(this);
};
