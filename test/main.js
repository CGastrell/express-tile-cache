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
    //sometimes osm takes too long
    this.timeout(5000);
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

  it("should throw error if cacheRoute is string and doesn't start with '/'", function(done){

    var sampleTileSource = {
      urlTemplate: tmsServiceUrl,
      cachepath: "cache",
      clearRoute: "clear"
    }

    assert.throws(function(){
      var a = TileCache(sampleTileSource);
    }, Error);
    done();
    
  });

  it("should be able to clear cache when using MemoryCache", function(done){
    var app = express();
    var sampleTileSource = {
      urlTemplate: tmsServiceUrl,
      cachepath: "cache",
      clearRoute: true
    }
    var b = TileCache(sampleTileSource);
    app.use(b);

    request(app)
      .get("/clearcache")
      .expect(200)
      .end(done);
  });

  it("should not implement /clearcache route if store doesn't support it", function(done){
    var app = express();
    var sampleTileSource = {
      urlTemplate: tmsServiceUrl,
      cachepath: "cache",
      store: require("../lib/memorycache")()
    }
    sampleTileSource.store.clear = "not here, not implemented";
    var b = TileCache(sampleTileSource);

    app.use(b);

    request(app)
      .get("/clearcache")
      .expect(404)
      .end(done);
  });

  it("should be able to set ttl for cache expiring", function(done){
    var sampleTileSource = {
      urlTemplate: tmsServiceUrl,
      cachepath: "cache",
      ttl: 2,
      store: require("../lib/memorycache")()
    }
    var b = TileCache(sampleTileSource);
    done(assert.equal(sampleTileSource.store.ttl, 2 * 60));
  });

  it("should skip cache if response status is greater than 300", function (done){
    var app = express();
    var sampleTileSource = {
      urlTemplate: tmsServiceUrl,
      cachepath: "cache",
      store: require("../lib/memorycache")()
    }
    var b = TileCache(sampleTileSource);
    app.use(b);

    request(app)
      .get("/tms/1.0.0/wrongmapspecs/4/5/6.png")
      .end(function(err, res){
        if(err) {
          done(err);
          return;
        }
        done(assert.equal(Object.keys(sampleTileSource.store.cache).length, 0));
      });
  });

});


describe("Routes", function(){
  after(function(done){
    if(fs.existsSync(sampleCacheDir)){
      fs.rmrfSync(sampleCacheDir);
    }
    done();
  });

  context("Tile info", function(){
    var app = express();
    var sampleTileSource = {
      urlTemplate: tmsServiceUrl,
      cachepath: sampleCacheDir,
      enableInfo: true
    }
    var b = TileCache(sampleTileSource);
    app.use(b);

    it('should be able to implement */info route to get cached tile data', function(done){
      request(app)
        .get("/tms/capabaseargenmap/4/5/6.png")
        .end(function(err){
          if(err) {
            return done(err);
          }
          request(app)
            .get('/tms/capabaseargenmap/4/5/6.png/info')
            .expect('Content-Type', /json/)
            .end(done);
        });
    });

  });


  context("TMS requests", function(){

    var app = express();
    var sampleTileSource = {
      urlTemplate: tmsServiceUrl,
      cachepath: sampleCacheDir
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
