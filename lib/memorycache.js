'use strict';
var debug = require('debug')('tilecache:memorycache');

module.exports = MemoryCache;

function MemoryCache () {
  if(!(this instanceof MemoryCache)){
    return new MemoryCache();
  }
  this.cache = {};
}

MemoryCache.prototype.get = function(hash, callback) {
  debug("Looking up %s", hash);
  if(callback && typeof(callback) === 'function') {
    callback(null, this.cache[hash]);
    return;
  }else{
    return this.cache[hash];
  }
}

MemoryCache.prototype.set = function(hash, properties) {
  debug("Caching %s", hash);
  this.cache[hash] = properties;
}

MemoryCache.prototype.clear = function() {
  debug("Clearing cache...");
  this.cache = {};
}