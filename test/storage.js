var assert = require('assert');
var Storage = require('../lib/cachestorage');
var sampleCacheDir = "cache";
var fs = require('fs.extra');
var stream = require('stream');

describe("CacheStorage", function(){

  afterEach(function(done){
    if(fs.existsSync(sampleCacheDir)){
      fs.rmrfSync(sampleCacheDir);
    }
    done();
  });

  it("returns an object", function(done){
    var a = Storage();
    done(assert(typeof(a) == "object"));
  });

  it("creates a default directory 'cache'", function(done){
    var a = Storage();
    done(a.tilepath == sampleCacheDir && assert(fs.existsSync(sampleCacheDir)));
  });

  it("can take a data stream and write it to filesystem without errors", function(done){
    var a = Storage();
    var rstream = fs.createReadStream("package.json");
    a.save(rstream,"testFile",done);
  });

  it("can read the filesystem and return a data stream", function(done){
    var a = Storage();
    var rstream = fs.createReadStream("package.json");
    a.save(rstream,"testFile", function(err, details) {
      if(err) {
        return done(err);
      }
      done(assert(a.get(details.Location) instanceof stream.Readable));

    });
  });

  it("the 'save' callback data has S3-like properties ", function(done){
    var a = Storage();
    var rstream = fs.createReadStream("package.json");
    a.save(rstream,"testFile", function(err, details) {
      if(err) {
        return done(err);
      }
      assert(details.Location);
      assert(details.Bucket);
      assert(details.Key);
      assert(details.ETag);

      done();
    });
  });

  //couldn't find a way to make stream fail... 
  // it("the 'save' callback can handle a stream error", function(done){
  //   var a = Storage();
  //   var rstream = fs.createReadStream("/dev/null");
  //   a.save(rstream,"testFile", function(err, details) {
  //     done(assert(err instanceof Error));
  //   });
  // });

});
