'use strict';

var debug = require('debug')('tilecache:main');
var express = require('express');
var url = require('url');
var request = require('request');
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

  this.TileStorage = options.storage || new CacheStorage(options.cachepath);
  this.Cache = options.store || new MemoryCache();
  this.TileSource = options.tilesource ? new TileSource(options.tilesource) : new TileSource(options);

  var _this = this;

  var router = express.Router();

  if(_this.Cache.clear && typeof(_this.Cache.clear) == "function") {
    //conditional route only if it is safe to call
    router.get("/clearcache", function(req, res, next){
      _this.Cache.clear(function(err) {
        if(err) {
          res.status(500).send({result: err});
          return;
        }
        res.status(200).send({result:"MemoryCache cleared"});
      });
    });

  }

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

          request(url).on('response', function(resp){

            //any other conditions for a cache skip should be here. Turn the statusCode in some config?
            if(parseInt(resp.statusCode, 10) >= 300) {
              debug('Response status code beyond 300 (%s), skipping cache abilities',resp.statusCode);
              return;
            }

            _this.TileStorage.save(resp, tileHash, function(err, details){
              if(err) {
                debug('Error saving tile');
                debug(err);
                return next(err);
              }
              _this.Cache.set(path.basename(tileHash), details);
            });
          }).pipe(res);

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


function _hash (str) {
  return crypto.createHash('md5').update(str).digest('hex');
};

