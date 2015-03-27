var debug = require('debug')('tilecache:tilesource')

module.exports = TileSource;
/**
 * TileSource
 * @param options: {Object}
 * @param options.urlTemplate: {String}
 * @param options.subdomains: {Array|String}
 * @param options.forceEpsg: {Integer|String}
 * @param options.forceNamespace: {String}
 */
function TileSource (options) {
  if(!(this instanceof TileSource)) {
    return new TileSource(options);
  }
  this.rotator = 0;
  this.urls = [];
  this.hasToRotate = false;
  this.useSubdomains = false;
  
  //must have options
  if(!options || Object.prototype.toString.call(options) !== "[object Object]") {
    throw new Error("TileSource needs a simple object to be setup");
  }

  //capture options
  this.subdomains = Array.isArray(options.subdomains) ? options.subdomains.slice() : options.subdomains;
  this.urlTemplate = Array.isArray(options.urlTemplate) ? options.urlTemplate.slice() : options.urlTemplate;
  this.forceEpsg = options.forceEpsg;
  this.forceNamespace = options.forceNamespace;
  this.customTilePath = options.getTilePath;

  //validate subdomains
  if(this.subdomains) {
    if(typeof this.subdomains === "string") {
      this.subdomains = [this.subdomains];
    }else if(!Array.isArray(this.subdomains)) {
      throw new Error("Subdomains must be a string, an array of strings or falsy")
    }

    this.hasToRotate = this.subdomains.length > 1;
    this.useSubdomains = true;
  }else{
    this.hasToRotate = false;
    this.useSubdomains = false;
  }

  //required params
  if(!this.urlTemplate) {
    throw new Error("The tilesouce must have a urlTemplate");
  }else{
    //is string?
    if(typeof this.urlTemplate === "string") {
      //if template'd string, check existance of subdomains
      if(!!~this.urlTemplate.indexOf("{s}") && !this.subdomains) {
        throw new Error("If urlTemplate is a replace template (holds a '{s}' string within it), you must provide at least one subdomain");
      }
      this.urlTemplate = [this.urlTemplate];
    //is array?
    }else if(Array.isArray(this.urlTemplate)) {
      //check all members are plain string urls
      this.urlTemplate.forEach(function(u){
        if(typeof u !== "string" || !!~u.indexOf("{s}")) {
          throw new Error("If urlTemplate is an array of urls, you can't include a replace string among them");
        }
      });
      //suspend subdomains usage and warn user
      //en este caso, tomar las urlTemplate y convertirlas en subdomains
      debug("You provided an array of urlTemplate's, subdomains param will be ignored");
      debug("WARN: Providing an array of urls is less cache effective than using a template");
      this.hasToRotate = true;
      this.useSubdomains = false;
      this.subdomains = this.urlTemplate.slice();
    }else{
      throw new Error("I don't know how to handle that urlTemplate, sorry :(");
    }
  }
}

TileSource.prototype.getTileUrl = function() {
  this.cycleRotator();
  var host, url;
  if(this.useSubdomains) {
    host = this.subdomains[this.rotator];
    url = this.urlTemplate[0].replace("{s}",host);
  }else{
    url = this.urlTemplate[this.rotator];
  }
  return url;
}

/**
 * Receives params as they are sent in the request
 * @param params.layer
 * @param params.z
 * @param params.x
 * @param params.y
 * @param params.format
 */
TileSource.prototype.getTilePath = function(params) {

  if(this.customTilePath) {
    return this.customTilePath.apply(this, arguments);
  }

  var epsg = this.forceEpsg || 3857;

  var layersplit = params.layer.split(":");

  var namespace = layersplit.length == 2 ? layersplit[0] : "";

  var layer = layersplit.length == 2 ? layersplit[1] : layersplit[0];

  namespace = this.forceNamespace || namespace;
  namespace = namespace ? namespace + ":" : "";

  var tilepath = [
    namespace + layer + "@EPSG:"+epsg+"@png8",
    params.z,
    params.x,
    params.y + "." + params.format
  ].join("/");

  return tilepath;
}

TileSource.prototype.cycleRotator = function() {
  if(!this.hasToRotate) {
    return;
  }
  this.rotator = ++this.rotator % this.subdomains.length << 0;
}
