var express = require("express");
var join = require('path').join;
app = express();

var tilecache = require("../");

// example to cache osm tiles, which are served with "y" param inverted
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
  cachepath: "cache"
}

app.use("/osm", tilecache(osm));

app.listen(process.env.PORT || 3000);