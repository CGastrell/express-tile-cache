var express = require('express');
var debug = require('debug')('tilecache:info');
var moment = require('moment');

var emptyTileInfo = {
  Location: '',
  Key: '',
  ETag: '',
  Bucket: '',
  created: '',
  cached: '',
  expires: ''
}
/**
 * Get info about a cached tile. If tile not cached will return (output) false
 */
module.exports = function(tileCache) {
  var router = express.Router();
  router.get(
    [
      '/tms/1.0.0/:layer/:z/:x/:y.:format/info',
      '/tms/:layer/:z/:x/:y.:format/info'
    ],
    function(req, res, next) {
      var tilepath = tileCache.TileSource.getTilePath(req.params);
      var tileHash = tileCache.hashString(tilepath);
      debug('Requiring cache info for %s', tileHash);
      tileCache.Cache.get(tileHash, function(err, cached){
        /* istanbul ignore if */
        if(err) {
          return next(err);
        }
        /* istanbul ignore if */
        if(!cached) {
          res.send(emptyTileInfo);
          return;
        }
        cached.cached = moment(cached.created).fromNow();
        /* istanbul ignore else */
        if(tileCache.Cache.ttl && moment(tileCache.Cache.ttl)) {
          cached.expires = moment(cached.created).add(tileCache.Cache.ttl,'seconds').fromNow();
        }
        res.send(cached);
      });

    }
  );
  return router;
}
