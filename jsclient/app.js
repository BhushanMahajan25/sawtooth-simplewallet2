const path = require('path');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const cors = require('cors');

const app = express();

app.use(cors(),(req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'/views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname,'public')));

app.use('/', require('./routes/index'));    

var PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`Server Listening at ${PORT}`));

