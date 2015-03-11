var express = require("express");

app = express();

var tilecache = require("../");


var capabaseargenmap = {
  urlTemplate: 'http://{s}.ign.gob.ar/geoserver/gwc/service/tms/1.0.0',
  subdomains: ['wms']
}

app.use("/baseargenmap", tilecache(capabaseargenmap));

app.listen(process.env.PORT || 3000);