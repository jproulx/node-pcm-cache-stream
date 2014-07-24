pcm-cache-stream
================
Given a live stream of raw PCM data, cache a configurable amount of seconds with valid samples.

The raison d'être for writing this module was to emulate Icecast's "burst-on-connect" setting, which allows live playback to start sooner for the listening client while introducing a small amount of latency.

## Use
```javascript
var PCMCacheStream = require('pcm-cache-stream');
var Speaker = require('speaker')({ 'sampleRate' : 44100, 'bitDepth' : 16, 'channels' : 2, 'cacheSeconds' : 3 });

// Start piping the audio directly to the speaker
process.stdin.pipe(PCMCacheStream).pipe(Speaker);

// During playback, the cache is continually adjusted going back 3 seconds
setTimeout(function () {
    console.log(PCMCacheStream.cache.length);
}, 10 * 1000);

```

## Example

```bash
$ ffmpeg -i song.mp3 -f s16le -acodec pcm_s16le -ar 44100 -ac 2 pipe:1 | node example.js
```
