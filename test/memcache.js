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
    assert(JSON.parse(a.cache["theKey"]).the == "value");
    done();
  });

  it('can retrieve a key/value pair asynchronously', function(done){
    var a = MemCache();
    var b = {the: "value"};
    a.set('theKey', b);
    a.get('theKey', function(err, value){
      assert(value.the == b.the);
      done(err);
    });
  });

  it('can retrieve a key/value pair synchronously', function(done){
    var a = MemCache();
    var b = {the: "value"};
    a.set('theKey', b);
    done(assert(a.get('theKey').the == b.the));
  });

  it('can clear its own cache', function(done){
    var a = MemCache();
    var b = {the: "value"};
    a.set('theKey', b);
    a.clear(function(err){
      if(err) {
        done(err);
        return;
      }
      done(assert(Object.keys(a.cache).length == 0));
    });
  });

  it('can delete specific key synchronously', function(done){
    var a = MemCache();
    var b = {the: "value"};
    a.set('theKey', b);
    a.delete("theKey")
    done(assert(a.get("theKey") == undefined));
  });

  it('can delete specific key asynchronously', function(done){
    var a = MemCache();
    var b = {the: "value"};
    a.set('theKey', b);
    a.delete("theKey", function(err, hashExisted){
      done(assert(a.get("theKey") == undefined));
    });
  });

  it("should ignore a delete command on a non existent hash", function(done){
    var a = MemCache();
    a.delete("theKey", function(err, hashExisted){
      done(assert(hashExisted == false));
    });
  });

  it("won't return an expired hash", function(done){
    var a = MemCache();
    a.setTtl(1 / 100);
    var b = {the: "value"};
    a.set('theKey', b);
    setTimeout(function(){
      done(assert.equal(a.get("theKey"), null));
    }, 1000);
  });

});
