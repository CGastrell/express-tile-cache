var express = require("express");
var join = require('path').join;
app = express();

var tilecache = require("../");

var capabaseargenmap = {
  urlTemplate: 'http://{s}.ign.gob.ar/geoserver/gwc/service/tms/1.0.0',
  subdomains: ['wms'],
  cachepath: join(__dirname,"cache"),
  clearRoute: "/clear"
}

app.use("/baseargenmap", tilecache(capabaseargenmap));

app.listen(process.env.PORT || 3000);