/**
 * v1.0.0
 */
'use strict';

var debug = require('debug')('tilecache:main');
var express = require('express');
var url = require('url');
var superagent = require('superagent');
var path = require('path');
var MemoryCache = require('./memorycache');
var CacheStorage = require('./cachestorage');
var TileSource = require('./tilesource');
var crypto = require('crypto');

module.exports = TileCache;


function TileCache(options){
  if (!(this instanceof TileCache)) {
    return new TileCache(options);
  }
  this.urlRotator = 0;

  //ensure coherent setup
  if(!options) {
    throw new Error("express-tile-cache needs a simple object setup");
  }
  if( !options.storage && !options.cachepath ) {
    throw new Error("You must configure a cachepath option or storage module in your tile source setup");
  }

  this.TileStorage = options.storage || new CacheStorage();
  this.Cache = options.store || new MemoryCache();
  this.TileSource = options.tilesource ? new TileSource(options.tilesource) : new TileSource(options);

  var _this = this;

  var router = express.Router();

  router.get("/clearcache", function(){
    _this.Cache.clear();
  });

  router.get(
    [
      "/tms/1.0.0/:layer/:z/:x/:y.:format",
      "/tms/:layer/:z/:x/:y.:format"
    ],
    function(req, res, next) {

      var tilepath = _this.TileSource.getTilePath(req.params);
      var tileHash = _hash(tilepath);

      _this.Cache.get(tileHash, function(err, cached){
        if(err) {
          return next(err);
        }

        if(!cached) {
          debug('Fetching tile from source');

          var url = _this.TileSource.getTileUrl() + "/" + tilepath;
          debug('Tile: %s', url);
          var request = superagent.get(url);
          request.pipe(res);
          
          tileHash = options.cachepath ? path.join(options.cachepath,tileHash) : tileHash;
          _this.TileStorage.save(request, tileHash, function(err, details){
            if(err) {
              debug('Error saving tile');
              debug(err);
              return;
            }
            _this.Cache.set(path.basename(tileHash), JSON.stringify(details));
          });

        }else{

          debug('Fetching tile from cache');

          var cachedTile = JSON.parse(cached);
          res.set('etag', cachedTile.ETag);

          _this.TileStorage.get(cachedTile.Location).pipe(res);
        }

      });
    }
  );
  return router;
}


function _hash (str) {
  return crypto.createHash('md5').update(str).digest('hex');
};

