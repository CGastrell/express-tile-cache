var assert = require("assert");
var TileCache = require("../");
var express = require("express");
var request = require("supertest");
var fs = require("fs.extra");

var sampleCacheDir = "cache";
//should use a more reliable tms service for testing
var tmsServiceUrl = "http://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0";

describe('express tile cache', function() {

  it('should throw error if instanced without options', function(done){

    assert.throws(function(){
      var a = TileCache();
    }, Error);
    done();
    
  });

  it('should throw error if either cachepath or storage in options', function(done){

    var sampleTileSource = {
      urlTemplate: "http://sample.com/tms/z/x/y.png"
    }

    assert.throws(function(){
      var a = TileCache(sampleTileSource);
    }, Error);
    done();
    
  });

  it('should return a Function instance', function(){
    
    var sampleTileSource = {
      urlTemplate: "http://sample.com/tms/z/x/y.png",
      cachepath: sampleCacheDir
    }
    var a = TileCache(sampleTileSource);

    assert.equal(typeof a, "function");

  });

  it("should handle TileSource override properly", function(done){

    var app = express();
    var osm = {
      tilesource: {
        urlTemplate: 'http://{s}.tile.openstreetmap.org',
        subdomains: "abc".split(""),
        getTilePath: function(params) {
          var ymax = 1 << params.z;
          var y = ymax - params.y - 1;
          return [params.z, params.x, y + ".png"].join("/");
        }
      },
      cachepath: sampleCacheDir
    }

    app.use(TileCache(osm));

    request(app)
      .get("/tms/1.0.0/capabaseargenmap/4/5/6.png")
      .expect(200)
      .end(done);

  });

  it("should be able to clear cache when using MemoryCache", function(done){
    var app = express();
    var sampleTileSource = {
      urlTemplate: tmsServiceUrl,
      cachepath: "cache"
    }
    var b = TileCache(sampleTileSource);
    app.use(b);

    request(app)
      .get("/clearcache")
      .expect(200)
      .expect(function(res){
        return !~res.body.result.indexOf("ok");
      })
      .end(done)
  });

});

describe("TMS service", function(){
  after(function(done){
    if(fs.existsSync(sampleCacheDir)){
      fs.rmrfSync(sampleCacheDir);
    }
    done();
  });

  context("Standard TMS request", function(){

    var app = express();
    var sampleTileSource = {
      urlTemplate: tmsServiceUrl,
      cachepath: "cache"
    }
    var b = TileCache(sampleTileSource);
    app.use(b);
    
    it("should respond to standard request", function(done){

      //there should be a better way to know if tile came from cache or not
      request(app)
        .get("/tms/1.0.0/capabaseargenmap/4/5/6.png")
        .expect(200)
        .end(done);
    });

    it("should respond from cache", function(done){

      //there should be a better way to know if tile came from cache or not
      request(app)
        .get("/tms/capabaseargenmap/4/5/6.png")
        .expect('etag', /.*/)
        .expect(200)
        .end(done);
    });
    
  });
  
  context("Standard TMS request without version (1.0.0)", function(){

    var app = express();
    var sampleTileSource = {
      urlTemplate: tmsServiceUrl,
      cachepath: "cache"
    }
    var b = TileCache(sampleTileSource);
    app.use(b);

    it("should respond to standard request even without TMS version", function(done){

      request(app)
        .get("/tms/capabaseargenmap/4/5/6.png")
        .expect(200)
        .end(done);
    });

    it("should respond to standard request even without TMS version from cache", function(done){

      request(app)
        .get("/tms/capabaseargenmap/4/5/6.png")
        .expect('etag', /.*/)
        .expect(200)
        .end(done);
    });


  });

});
