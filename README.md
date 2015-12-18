# express-tile-cache
 
Express-tile-cache is a tile cacher for [TMS](http://wiki.osgeo.org/wiki/Tile_Map_Service_Specification) services.

It will register a standard 1.0.0 TMS endpoint and will fetch tiles from others servers, cache them, and then serve those tiles from the cache.

By default it will cache tiles to filesystem and mantain an in memory index/cache of requests, but both internal `Cache` index and `TileStorage` can be easily extended to meet your needs. There are currently 2 extensions, [s3-tile-storage](https://www.npmjs.com/package/s3-tile-storage) and [redis-tile-store](https://www.npmjs.com/package/redis-tile-store).

The builtin default `Cache` and `TileStorage` are meant for debugging and test purposes, not for production.


## Overview

**express-tile-cache** returns a express.Router() with two TMS specification standard routes adjusted to work with [Geoserver TMS service](http://docs.geoserver.org/stable/en/user/webadmin/tilecache/defaults.html).

    
    var tilecache = require("express-tile-cache");

### Default routes

Express-tile-cache implements two default routes:

    "/tms/1.0.0/:layer/:z/:x/:y.:format"
    "/tms/:layer/:z/:x/:y.:format"

And as it returns an express.Router() instance you can hook it on your custom route:

    app.use("/mytiles", tilecache(options));
    app.use("/moretiles", tilecache(options));

Using the first custom route shown above, your complete tile URL might look like:

    http://{serverAndPort}/mytiles/tms/1.0.0/{layer}/{z}/{x}/{y}.png


## Installation 

    npm install express-tile-cache --save

## Usage

Express-tile-cache uses a simple object to configure where the source TMS is. This object only needs to specify an URL and a cache path (to store tiles).

    var express = require("express"),
      tilecache = require("express-tile-cache"),
      app = express();

    var ignTileSource = {
      urlTemplate: "http://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0",
      cachepath: "cache"
    }

    app.use(tilecache(ignTileSource));


### Options

Options is a simple javascript object. Requirements and defaults:

  * `urlTemplate` *{String}*: the TMS service url you'll be requesting tiles from. It can handle multiple hosts. ie: `http://{s}.tiles.com/`. This type of template requires you to configure a `subdomains` property on the tile source object.
  * `subdomains` *{Array|String}*: optional - an array of strings or string to replace in the `urlTemplate`. ie: `["tiles1","tiles2"]`.
  * `cachepath` *{String}*: a directory where tiles will be stored and served from. This is internally handled by express-tile-cache. It defaults to *cache* and it will be created if it doesn't exist. This parameter becomes obsolete in the presence of a custom `storage` parameter.
  * `forceEpsg` *{Number/String}*: optional - if specified, express-tile-cache will append this EPSG code to requests made to the TMS service. This should be an integer or a String representing an integer, ie: "3857"
  * `forceNamespace` *{String}*: optional - layer names are usually simple strings, Geoserver accepts layers to be served under namespaces. Setting this option makes express-tile-cache to construct layer names with this namespace appended. 
  * `storage` *{Storage class instance}*: optional - shall you need to store tiles differently you can pass your own class/instance here. Read the **express-tile-cache.TileStorage** section on how to extend the storage module. Setting this option overrides `cachepath`.
  * `store` *{Store class instance}*: optional - if you want to provide a different class of memory cache you can pass it here. Read the **express-tile-cache.Cache** section on how to extend the store module.
  * `ttl` *{Number}*: optional, since v1.3.0 - **seconds** to keep cache valid for *each* tile. When you set this value **MemoryCache.setTtl** is called internally upon instantiation, but you won't be able to change it on the fly.
  * `enableInfo` *{Boolean}*: sets up the same default `GET` routes with the */info* suffix to check on the tile cache data. Result is JSON. Ex: `/tms/1.0.0/layer/4/5/6.png/info`
  * `clearRoute` *{String}*: optional - if true it will enable a default */clearcache* route to clear the cache index. Use a string starting with a `/` to enable and set custom clear route. **Heads up!**: the route is configured without any security and responds to a simple *GET* request. Also, the *store* being used has to implement a `clear()` method.
  * `tilesource` *{Object}*: optional - if the source of the tiles you need to retrieve is not TMS 1.0.0 compliant, you can provide a custom object to retrieve the tiles properly. Setting this option will override/invalidate `urlTemplate`, `subdomains`, `forceEpsg` and `forceNamespace` with its own.
    * `urlTemplate` *{String|Array}*: same as above, but in this case you can provide an array of urls. This option would override `subdomains`.
    * `subdomains` *{String|Array}*: same as above.
    * `forceEpsg` *{Number|String}*: same as above.
    * `forceNamespace` *{String}*: same as above.
    * `getTilePath` *{Function}*: a conversion function. This functions enables you to manage how parameters are transformed to match how your tile source needs to be queried. It will receive a `params` object which carries the parameters received in the original TMS request:
      * `layer` *{String}*: name of the layer or map type
      * `x` *{Number}*: the X value for the tile grid
      * `y` *{Number}*: the Y value for the tile grid
      * `z` *{Number}*: the zoom level
      * `format` *{String}*: the image format requested (png, jpg)
      * Read the express-tile-cache.TileSource section to fine tune your own tile source

## API

### Module

    var tilecache = require("express-tile-cache");

#### The storage option - Extending express-tile-cache.TileStorage

TileStorage is a small class that handles saving and retrieving tiles.

Shall you need or want to extend this module you can check the source, but it's as simple as implementing two main methods: `save` and `get`.

##### save(stream, filename, callback);

`save` will receive three arguments and will manage its output via callback:

  * `stream` *{Stream}*: to be piped. This usually is a readable stream, and is piped to a *filesystem.createWritableStream*
  * `filename` *{String}*: name of the file to save.
  * `callback` *{Function}*: a function that will receive:
    * `error` *{Error or null}*:
    * `details` *{Object}*: an object holding details of the tile saved. This was mainly prepared to implement [AWS S3 storage](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html), so these properties are fully compliant with S3 upload return values.
      * `details.Location` *{String}*: where to find the file. In the case of the default TileStorage, which uses the local filesystem, it is a path.
      * `details.Key` *{String}*: the filename.
      * `details.Bucket` *{String}*: additional information on the path. In the case of filesystem, this value holds the directory where the tile was saved.
      * `details.Etag` *{String}*: an Etag to serve the tile with. The default TileStorage uses the express-tile-cache *hashed* filename.

##### get(filepath|url)

`get` receives only one argument and returns a [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable) which is piped to the response

  * `filepath` *{String}*: the path to tile to be served



#### The store option - Extending express-tile-cache.Cache

Cache is the internal index reference **express-tile-cache** keeps to store key pairs of cached requests.

Shall you need or want to extend this module you can check the source, but here are the main methods you should implement.

##### set(hash, data)

`set` receives the hash (key) and a set of properties (usually the return values from the TileStorage).

  * `hash` *{String}*: the key to store the data in.
  * `data` *{Object}*: JSON object with the tile properties to be stored.

`set` doesn't return a value and doesn't implement a callback (failure is not an option).

##### get(hash, [callback])

`get` retrieves the data associated with a previously set tile hash.

  * `hash` *{String}*: the key to retrieve.
  * `callback` *{Function}*: the callback executed when the dataset is retrieved. Callback receives these arguments:
    * `err` *{Error}*: shall anything bad had happened, usually (happily) empty/null.
    * `data` *{Object}*: dataset associated with the tile hash. This dataset is the original data associated with a tile and conforms to:
      * `data.Location` *{String}*: where to find the file. In the case of the default TileStorage, which uses the local filesystem, it is a path.
      * `data.Key` *{String}*: the filename.
      * `data.Bucket` *{String}*: additional information on the path. In the case of filesystem, this value holds the directory where the tile was saved.
      * `data.Etag` *{String}*: an Etag to serve the tile with. The default TileStorage uses the express-tile-cache *hashed* filename.

Particularily *MemoryCache* `get` can be called without a callback, thus returnin **synchronously** the result. This is not NodeJS style and it remains this way in *MemoryCache* because it is **NOT meant for production purposes** (an in memory array is not a very good idea, but it is fast to make a test)

##### delete(hash)

`delete` simply looks for the hash and deletes the member. You should implement this functionality as it will be used for route `*/clear`

##### setTtl(seconds)

As of 1.3.0 the cache can handle expiration for every indexed tile, this is as simple as taking the creation date of the member an compare it with some stored seconds variable (ttl).

`setTtl` can be called anytime, but it is not exposed as part of the *express-tile-cache* API, so, provided value is used upon instantiation via `ttl` option.

If you need to change `ttl` value in runtime, you can provide and instance of *MemoryCache* and then play with it:
```javascript
var express = require('express');

//instance the builtin memorycache
var memoryCache = require("path-to-express-tile-cache/lib/memorycache")();

var tileCache = require("express-tile-cache");

var ignArTiles = tileCache({
  urlTemplate: "http://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0",
  cachepath: "cache",
  ttl: 60
  store: memoryCache //use the instance of the default memorycache
});

var app = express();

app.use(ignArTiles);

//change the ttl
memoryCache.setTtl(10); // sets expiring to 10 seconds

app.listen(process.env.PORT || 3000);
```

##### clear(callback) - Optional

Optional method to clear the whole cache. This is not required and is quite easy to do and need while in development with an in memory Array, but it's quite expensive on remotes (Redis, MemCache).

It is used within conditional route `/clearcache` (route is only defined if the method exists)

`clear` should handle clearing the whole cache and return the callback. Callback will return without arguments or the error.

  * callback(err) *{Function}* - err should be null for success or else a *{String}* with a explaining message.

#### The tilesource option

Provides a way to override how **express-tile-cache** makes requests to the original tile source. Besides the usual configuration you can control how TMS parameters are sent to the tile source.

The `getTilePath` function must return a *{String}* which is the path to append in the url to request the tile.

An easy way to understand this is with an example:

[OpenStreetMaps handles tiles](http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames) in a non (TMS) standard way. It accomodates to the grid in the same way that [Google Maps do](https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/): the Y tile grid is inverted. So, a TileSource for OSM would look like:

```javascript
var osm = {
  tilesource: {
    urlTemplate: 'http://{s}.tile.openstreetmap.org',
    subdomains: ['a','b','c'],
    getTilePath: function(params) {
      var ymax = 1 << params.z;
      var y = ymax - params.y - 1;
      return [params.z, params.x, y + ".png"].join("/");
    }
  },
  cachepath: "./cache"
}
app.use("/osm", tilecache(osm));
```
With this configuration you can have your own OSM tile cache.

Check the provided links to see what I'm talking about.

**NOTE**: `this` in the `getTilePath` function refers to the main **express-tile-cache** class (just in case)

# Test

Since 1.2.2 a unit test is implemented with mocha and istanbul. The test unit outputs a coverage report and asserts almost every function on the scripts. To run the unit test:

```javascript
cd express-tile-cache
npm install
npm test
```

# Changelog

## 1.3.5

  * Added `enableInfo` option to be able to check individual tile cache status
  * Enhanced docs and added an example
  * Changed `ttl` and MemoryCache.`setTtl` to use seconds as it is the standard

## 1.3.4

  * Added `ttl` support on *MemoryCache*
  * Performed some linting
  * Removed unused dependencies
  * More testing, implemented Istanbul
  
## 1.3.2

  * New option `clearRoute` to set an automagic route to clear the cache index
  * Removed `superagent` dependency, added `request`
  * Fixed bugs
  * Fixed bad data manipulation
  * Added missing error callback on TMS request
  * Skip cache when TMS request fails (error codes >= 300)

## 1.3.0-beta

  * Conditional route /clearcache set if the *store* implements a method `clear`

## 1.3.0

  * Moved tile info manipulation into MemoryCache module (stringify and parse are properly handled by MemoryCache)
  * Added `ttl` option to stablish cache expiring
  * Added *MemoryCache.delete* to delete specific hash cache
  * Added *MemoryCache.setTtl* to set an expiring age for cache entries
  * Added route to check tile cache info
  * Added route to clear specific tile cache

# License 

The MIT License (MIT)

Copyright (c) 2015 Christian Gastrell &lt;cgastrell@gmail.com&gt;.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
