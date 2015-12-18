'use strict';

var debug = require('debug')('tilecache:main');
var express = require('express');
// var url = require('url');
var request = require('request');
var path = require('path');
var MemoryCache = require('./memorycache');
var CacheStorage = require('./cachestorage');
var TileSource = require('./tilesource');
var crypto = require('crypto');

module.exports = TileCache;


function TileCache(options) {
  if (!(this instanceof TileCache)) {
    return new TileCache(options);
  }
  this.urlRotator = 0;

  //ensure coherent setup
  if(!options) {
    throw new Error('express-tile-cache needs a simple object setup');
  }
  if( !options.storage && !options.cachepath ) {
    throw new Error('You must configure a cachepath option or storage module in your tile source setup');
  }

  this.hashString = function (str) {
    return crypto.createHash('md5').update(str).digest('hex');
  }

  this.TileStorage = options.storage || new CacheStorage(options.cachepath);
  this.TileSource = options.tilesource ? new TileSource(options.tilesource) : new TileSource(options);
  this.Cache = options.store || new MemoryCache();


  if(options.ttl) {
    this.Cache.setTtl(options.ttl);
  }

  var _this = this;

  var router = express.Router();

  //info route
  if(options.enableInfo) {
    router.use('/',require('./info')(this));
  }

  if(options.clearRoute && _this.Cache.clear && typeof _this.Cache.clear === 'function') {
    //conditional route only if it is safe to call

    var clearRoute = typeof options.clearRoute === 'string' ? options.clearRoute : '/clearcache';
    if(clearRoute.indexOf('/') !== 0) {
      throw new Error('clearRoute should be a string beggining with a "/" or simply true (defaults to "/clearcache")');
    }
    router.get(clearRoute, function(req, res, next){
      _this.Cache.clear(function(err) {
        /* istanbul ignore if */
        if(err) {
          res.status(500).send({result: err});
          return;
        }
        res.status(200).send({result: 'Cache index cleared'});
      });
    });

  }

  router.get(
    [
      '/tms/1.0.0/:layer/:z/:x/:y.:format',
      '/tms/:layer/:z/:x/:y.:format'
    ],
    function(req, res, next) {

      var tilepath = _this.TileSource.getTilePath(req.params);
      var tileHash = _this.hashString(tilepath);

      _this.Cache.get(tileHash, function(err, cached){
        /* istanbul ignore if */
        if(err) {
          return next(err);
        }

        if(!cached) {
          debug('Fetching tile from source');

          var url = _this.TileSource.getTileUrl() + '/' + tilepath;
          debug('Tile: %s', url);

          request
            .get(url)
            .on('error', /* istanbul ignore next */ function(er){
              debug('Server error');
              debug(er);
              res.status(500).send('TMS refused connection');
            })
            .on('response', function(resp){

              //any other conditions for a cache skip should be here. Turn the statusCode in some config?
              if(parseInt(resp.statusCode, 10) >= 300) {
                debug('Response status code beyond 300 (%s), skipping cache abilities', resp.statusCode);
                return;
              }
              debug('Saving file to storage');

              _this.TileStorage.save(resp, res, tileHash, function(err2, details){

                /* istanbul ignore if */
                if(err2) {
                  debug('Error saving tile');
                  debug(err2);
                  return next(err2);
                }
                _this.Cache.set(path.basename(tileHash), details);
              });
            })

        }else{

          debug('Fetching tile from cache');

          var cachedTile = cached;
          res.set('etag', cachedTile.ETag);

          _this.TileStorage.get(cachedTile.Location).pipe(res);
        }

      });
    }
  );
  return router;
}



