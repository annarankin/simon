var express = require('express');
var ejs = require('ejs');
var app = express();
var port = process.env.PORT || 3000;

app.use(express.static('public'));
app.set('view engine', 'ejs')

app.get('/', function(req, res) {
  res.render("index");
});

app.listen(port, function() {
  console.log("I'm lisinin");
})