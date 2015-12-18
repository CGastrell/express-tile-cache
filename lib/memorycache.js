'use strict';
var debug = require('debug')('tilecache:memorycache');

module.exports = MemoryCache;

function MemoryCache () {
  if(!(this instanceof MemoryCache)){
    return new MemoryCache();
  }
  this.cache = {};

  //max seconds to be a valid cache entry
  //default is 1.000.000 days
  //using seconds as it is the usual unit in TTL
  this.ttl = 60 * 60 * 24 * 1000000;
}

MemoryCache.prototype.get = function(hash, callback) {
  debug("Looking up %s", hash);
  var toReturn = null;
  if(this.cache[hash]) {
    toReturn = JSON.parse(this.cache[hash]);
    if(new Date() - new Date(toReturn.created) > this.ttl * 1000) {
      toReturn = null;
    }
  }
  if(callback && typeof(callback) === 'function') {
    callback(null, toReturn);
    return;
  }else{
    return toReturn;
  }
}

MemoryCache.prototype.set = function(hash, properties) {
  debug("Caching %s", hash);
  properties.created = new Date();
  this.cache[hash] = JSON.stringify(properties);
}

MemoryCache.prototype.clear = function(callback) {
  debug("Clearing cache...");
  this.cache = {};
  return callback(null)
}

MemoryCache.prototype.delete = function(hash, callback) {
  debug("Clearing hash...");
  var exists = this.cache[hash] ? true : false;
  if(exists) {
    this.cache[hash] = undefined;
    delete this.cache[hash];
  }
  if(callback && typeof(callback) == "function") {
    callback(null, exists);
  }
}

MemoryCache.prototype.setTtl = function(seconds) {
  //convert to seconds
  this.ttl = seconds;
}