var assert = require('assert');
var MemCache = require('../lib/memorycache');
var express = require('express');


describe('MemoryCache', function(){

  it('returns an object with a "cache" property', function(done){
    var a = MemCache();
    done(assert(typeof(a) == "object" && a.cache));
  });

  it('has a "set" function', function(done){
    var a = MemCache();
    done(assert(typeof(a.set) == "function", "typeof 'set' should've been 'function'"));
  });

  it('has a "get" function', function(done){
    var a = MemCache();
    assert(typeof(a.get) == "function");
    done();
  });

  it('can set a key/value pair', function(done){
    var a = MemCache();
    var b = {the: "value"};
    a.set('theKey', b);
    assert(a.cache["theKey"].the == "value");
    done();
  });

  it('can retrieve a key/value pair asynchronously', function(done){
    var a = MemCache();
    var b = {the: "value"};
    a.set('theKey', b);
    a.get('theKey', function(err, value){
      assert(value == b)
      done(err);
    });
  });

  it('can retrieve a key/value pair synchronously', function(done){
    var a = MemCache();
    var b = {the: "value"};
    a.set('theKey', b);
    
    done(assert(a.get('theKey') == b));
  });

  it('can clear its own cache', function(done){
    var a = MemCache();
    var b = {the: "value"};
    a.set('theKey', b);
    a.clear();
    done(assert(Object.keys(a.cache) == 0));
  });

});
