var assert = require('assert');
var TileSource = require('../lib/tilesource');
var fs = require('fs.extra');

describe("TileSource", function(){

  it("should error if no options are passed", function(done){

    assert.throws(function(){
      var a = TileSource();
    }, Error);
    done();

  });

  describe("TileSource 'urlTemplate' param checking", function(){

    it("should error if no 'urlTemplate' was provided in options", function(done){

      var sampleTileSource = {
        subdomains: false
      }
      assert.throws(function(){
        var a = TileSource(sampleTileSource);
      }, Error);
      done();

    });

    it("should error if 'urlTemplate' is not String or Array", function(done){

      var sampleTileSource = {
        urlTemplate: function(){}
      }
      assert.throws(function(){
        var a = TileSource(sampleTileSource);
      }, Error);
      done();

    });

    it("should error if 'urlTemplate' is Array of Strings with replaceable '{s}'", function(done){

      var sampleTileSource = {
        urlTemplate: ["oh hai {s}","we has a {s} among us"],
        subdomains: ['a,b']
      }
      assert.throws(function(){
        var a = TileSource(sampleTileSource);
      }, Error);
      done();

    });

    it("should error if 'urlTemplate' has replaceable '{s}' and no subdomains were provided", function(done){

      var sampleTileSource = {
        urlTemplate: "we has a {s} among us"
      }
      assert.throws(function(){
        var a = TileSource(sampleTileSource);
      }, Error);
      done();

    });

  });

  describe("TileSource 'subdomains' param checking", function(){

    it("should error if 'subdomains' is not String, Array or falsy", function(done){

      var sampleTileSource = {
        urlTemplate: ["we has a {s} among us"],
        subdomains: function(){}
      }
      assert.throws(function(){
        var a = TileSource(sampleTileSource);
      }, Error);
      done();

    });

    it("should accept and handle 'subdomains' as a String", function(done){
      var sampleTileSource = {
        urlTemplate: "some {s}ed url template",
        subdomains: "host"
      }
      var a = TileSource(sampleTileSource);

      done(assert(a.getTileUrl() == "some hosted url template"));
    });

  });

  it("returns an object", function(done){
    var sampleTileSource = {
      urlTemplate: "some url template"
    }
    var a = TileSource(sampleTileSource);

    done(assert(typeof(a) == "object"));
  });

  describe("TileSource::getTilePath", function(){

    it("should have a default 'getTilePath' method", function(done){
      var sampleTileSource = {
        urlTemplate: "some url template"
      }
      var a = TileSource(sampleTileSource);

      done(assert(typeof(a.getTilePath) == "function"));
    });

    it("default 'getTilePath' method should return a string", function(done){
      var sampleTileSource = {
        urlTemplate: "some url template"
      }
      var params = {
        layer: "namespace:layer",
        z: "z",
        x: "x",
        y: "y",
        format: "png"
      }
      var a = TileSource(sampleTileSource);

      done(assert(typeof(a.getTilePath(params)) == "string"));
    });

    it("should accept a custom 'getTilePath' method which returns a string", function(done){
      var sampleTileSource = {
        urlTemplate: "some url template",
        getTilePath: function(args) {
          return Object.keys(args).join(".");
        }
      }
      var params = {
        layer: "layer",
        z: "z",
        x: "x",
        y: "y",
        format: "png"
      }
      var a = TileSource(sampleTileSource);

      done(assert(typeof(a.getTilePath(params)) == "string"));
    });

    it("should handle optional 'forceEpsg' and 'forceNamespace' params", function(done){
      var sampleTileSource = {
        urlTemplate: "some url template",
        forceEpsg: 4326,
        forceNamespace: 'test'
      }
      var params = {
        layer: "layer",
        z: "z",
        x: "x",
        y: "y",
        format: "png"
      }
      var a = TileSource(sampleTileSource);

      done(assert(typeof(a.getTilePath(params)) == "string"));
    });

  });

  describe("TileSource::getTileUrl", function(){

    it("should return a string", function(done){
      var sampleTileSource = {
        urlTemplate: "some url template"
      }
      var a = TileSource(sampleTileSource);

      done(assert(typeof(a.getTileUrl()) == "string"));

    });

    it("should rotate urls (no 'subdomains' provided)", function(done){
      var sampleTileSource = {
        urlTemplate: ["some url template", "some other url template"]
      }
      var a = TileSource(sampleTileSource);

      done(assert(a.getTileUrl() != a.getTileUrl()));

    });

    it("should rotate urls (with 'subdomains')", function(done){
      var sampleTileSource = {
        urlTemplate: "some url {s} replace template",
        subdomains: ["a","b"]
      }
      var a = TileSource(sampleTileSource);

      done(assert(a.getTileUrl() != a.getTileUrl()));

    });

  });

  it("should cycle TileSource.rotator when using 'subdomains'", function(done){
    var sampleTileSource = {
      urlTemplate: ["some url template", "some other url template"]
    }
    var a = TileSource(sampleTileSource);
    var rot = a.rotator;
    a.cycleRotator();
    done(assert(rot != a.rotator));

  })

  it("should NOT cycle TileSource.rotator when 'subdomains' == false", function(done){
    var sampleTileSource = {
      urlTemplate: "some other url template"
    }
    var a = TileSource(sampleTileSource);
    var rot = a.rotator;
    a.cycleRotator();
    done(assert(rot == a.rotator));

  })

});