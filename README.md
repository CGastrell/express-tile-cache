# express-tile-cache
 
Express-tile-cache is a tile cacher for [TMS](http://wiki.osgeo.org/wiki/Tile_Map_Service_Specification) map tiles services.

By default it will cache tiles to filesystem and mantain a memory cache of requests, but both internal MemoryCache and Storage can be easily extended. There are currently 2 extensions, [s3-tile-storage](https://github.com/CGastrell/s3-tile-storage) and [redis-tile-store](https://github.com/CGastrell/redis-tile-store).


## Overview

**express-tile-cache** returns a express.Router() with two default routes compatible with TMS specification, but more accurately, adjusted to work with [Geoserver TMS service](http://docs.geoserver.org/stable/en/user/webadmin/tilecache/defaults.html).

    
    var tilecache = require("express-tile-cache");

### Default routes

Express-tile-cache implements two default routes:

    "/tms/1.0.0/:layer/:z/:x/:y.:format"
    "/tms/:layer/:z/:x/:y.:format"

And as it returns an express.Router() instance you can hook it on your custom route:

    app.use("mytiles", tilecache(options));
    app.use("moretiles", tilecache(options));


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


### Tile sources

Tile source objects are simple javascript objects. Requirements and defaults:

  * `urlTemplate` - {String}: the TMS endpoint you'll be requesting tiles from. It can handle multiple hosts. ie: `http://{s}.tiles.com/`. This type of template requires you to configure a `subdomains` property on the tile source object.
  * `subdomains` - {Array}: an array of strings to replace in the `urlTemplate`. ie: `["tiles1","tiles2"]`
  * `cachepath` - {String}: a directory where tiles will be stored and served from. This is internally handled by express-tile-cache. The directory should exist, express-tile-cache won't create it for you.
  * `storage` - {Storage module instance}: shall you need to store tiles differently you can pass your own class/instance here. Read specifications on how to extend the storage module.
  * `forceEpsg` - {Number/String}: if specified, express-tile-cache will append this EPSG to requests made to the TMS service. This should be an integer or a String representing an integer
  * `forceNamespace` - {String}: layer names are usually simple strings, Geoserver accepts layers be served under namespaces. Setting this option makes express-tile-cache to construct layer names with this namespace appended. 

## API

### Module

The **express-tile-cache** module returns an express.Router() function 

    var tilecache = require("express-tile-cache");

#### express-tile-cache.TileStorage

TileStorage is a small class that handles saving and retrieving tiles.

Shall you need or want to extend this module you can check the source, but it's as simple as implementing two main methods: `save` and `get`.

`save` will receive three arguments and will manage its output via callback:

  * `stream`: {Stream} to be piped. This usually is a readable stream, and is piped to a *filesystem.createWritableStream*
  * `filename`: {String} name of the file to save.
  * `callback`: {Function} a function that will receive:
    * `error`: {Error or null}
    * `details`: {Object} an object holding details of the tile saved. This was mainly prepared to implement [AWS S3 storage](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html), so these properties are fully compliant with S3 upload return values.
      * `details.Location`: {String} where to find the file. In the case of the default TileStorage, which uses the local filesystem, it is a path.
      * `details.Key`: {String} the filename.
      * `details.Bucket`: {String} additional information on the path. In the case of filesystem, this value holds the directory where the tile was saved.
      * `details.Etag`: {String} an Etag to serve the tile with. The default TileStorage uses the express-tile-cache *hashed* filename.

`get` receives only one argument and returns a [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable) which is piped to the response

  * `filepath`: {String}



#### express-tile-cache.Cache

Cache is the internal reference express-tile-cache keeps to store key pairs of cached requests. It's just a little class storing and retrieving 

Shall you need or want to extend this module you can check the source, but it's as simple as implementing two main methods: `set` and `get`.

`set` receives the hash (key) and a set of properties (usually the return values from the TileStorage).

  * `hash`: {String} - the key to store the data in.
  * `data`: {Object} - JSON object with the tile properties to be stored.

`set` doesn't return a value and doesn't implement a callback (it should).

`get` retrieves the data associated with a previously set tile hash.

  * `hash`: *{String}* - the key to retrieve.
  * `callback`: *{Function}* - the callback executed when the dataset is retrieved. Callback receives these arguments:
    * `err`: *{Error}* - shall anything bad had happened, usually (happily) empty/null.
    * `data`: *{Object}* - dataset associated with the tile hash. This dataset is the original data associated with a tile and conforms to:
      * `data.Location`: {String} where to find the file. In the case of the default TileStorage, which uses the local filesystem, it is a path.
      * `data.Key`: {String} the filename.
      * `data.Bucket`: {String} additional information on the path. In the case of filesystem, this value holds the directory where the tile was saved.
      * `data.Etag`: {String} an Etag to serve the tile with. The default TileStorage uses the express-tile-cache *hashed* filename.



# License 

The MIT License (MIT)

Copyright (c) 2014, 2015 Shovel apps, Inc.

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