//sample, change cache ttl
var express = require('express');

//instance the builtin memorycache
var memoryCache = require("../lib/memorycache")();

var tileCache = require("../lib");

var ignArTiles = tileCache({
  urlTemplate: "http://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0",
  cachepath: "cache",
  ttl: 60, //remember these are minutes
  store: memoryCache //use the instance of the default memorycache
});

var app = express();

app.use(ignArTiles);

//change the ttl
memoryCache.setTtl(1 / 10); //remember, minutes, so this sets expiring to 6 seconds aprox

app.listen(process.env.PORT || 3000);