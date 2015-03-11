'use strict';

var debug = require('debug')('tilecache:main');
var express = require('express');
var url = require('url');
var superagent = require('superagent');
var path = require('path');
var MemoryCache = require('./memorycache');
var CacheStorage = require('./cachestorage');
var crypto = require('crypto');

module.exports = TileCache;


function TileCache(options){
  if (!(this instanceof TileCache)) {
    return new TileCache(options);
  }
  this.urlRotator = 0;

  this.TileStorage = options.storage || new CacheStorage();
  this.Cache = options.store || new MemoryCache();

  var _this = this;

  var router = express.Router();
  router.get(
    [
      "/tms/1.0.0/:layer/:z/:x/:y.:format",
      "/tms/:layer/:z/:x/:y.:format"
    ],
    function(req, res, next) {

      var epsg = options.forceEpsg || 3857;

      var layersplit = req.params.layer.split(":");

      var namespace = layersplit.length == 2 ? layersplit[0] : "";

      var layer = layersplit.length == 2 ? layersplit[1] : layersplit[0];

      namespace = options.forceNamespace || namespace;
      namespace = namespace ? namespace + ":" : "";

      var tilepath = [
        namespace + layer + "@EPSG:"+epsg+"@png8",
        req.params.z,
        req.params.x,
        req.params.y + "." + req.params.format
      ].join("/");

      var url = options.urlTemplate;
      url += "/" + tilepath;
      
      var tileHash = _hash(url);

      //aca hay que checkear contra el cache a ver si el hash existe o no
      //implementar redis, mirar connect-redis / express-session
      _this.Cache.get(tileHash, function(err, cached){
        if(err) {
          return next(err);
        }

        if(!cached) {
          debug('Fetching tile from source');

          //este hostname tiene que rotar
          var hostname = options.subdomains ?
            options.subdomains[++_this.urlRotator % options.subdomains.length] : false;
          url = hostname ? url.replace("{s}",hostname) : url;
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

