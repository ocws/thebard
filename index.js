var express = require('express'),
    hbs = require('hbs'),
    request = require('request'),
    dir = require('node-dir'),
    fs = require('fs'),
    bodyParser = require('body-parser'),
    assert = require('assert'),
    session = require('express-session'),
    cookieParser = require('cookie-parser'),
    MongoClient = require('mongodb').MongoClient,
    parseString = require('xml2js').parseString;
var app = require('express')();
var http = require('http').Server(app);
var toRoman = require('roman-numerals').toRoman;
var toArabic = require('roman-numerals').toArabic;

var util = require('util');
var plays = [];
dir.files(__dirname + "/scripts", function(err, files) {
    if (err) throw err;
    console.log(files);
    files.forEach(function(path) {
        if(path.indexOf('.xml') !== -1 && path.indexOf('.git') == -1) {
            fs.readFile(path, function (err, data) {
                parseString(data, function (err, result) {
                    var play = new Play(result);
                    plays.push(play);

                });
            });
        }
    })
});

hbs.registerPartials(__dirname + '/views/partials');
app.set('view engine', 'hbs');
app.set('port', (process.env.PORT || 5000));
app.use(express.static("assets"));
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
app.use(cookieParser());
app.use(session({
    secret: 'keyboard cat'
}));

app.get('/', function (req, res) {
    res.render('index', {});
});
app.get('/faq', function(req, res){
    res.render('faq', {});
});
app.get('/team', function(req, res){
    res.render('team', {});
});
app.get('/tag/:tagId', function(req, res){
    var playsWithTag = getPlaysWithTag(req.params.tagId);

    for(var i = 0; i < playsWithTag.length; i++) playsWithTag[i] = playsWithTag[i].getDescriptor();
    res.render('playlist', {title: req.params.tagId, texts: playsWithTag});
});
app.get('/:play', function(req, res){
    var play = getPlayByShortName(req.params.play);
    if(play != null){
        res.render('playcover', {title: play.getTitle(), desc: play.getDescriptor(), toc: play.getTableOfContents()});
    }
    else {
        res.end("Play not found");
    }
});
app.get('/:play/full', function(req, res){
    var play = getPlayByShortName(req.params.play);
    if(play != null) {
        res.render('full', {play: play.getTextObject(), desc: play.getDescriptor()});
    }
    else{
        res.end("Play not found.");
    }
});
app.get('/:play/:act', function(req, res){
    var play = getPlayByShortName(req.params.play);
    if(play != null) {
        res.render('act', {act: play.getActObject(req.params.act), desc: play.getDescriptor(), actId: ensureRoman(req.params.act)});
    }
    else{
        res.end("Play not found.");
    }
});
app.get('/:play/:act/:scene', function(req, res){
    var play = getPlayByShortName(req.params.play);
    if(play != null) {
        res.render('scene', {scene: play.getSceneObject(req.params.act, req.params.scene), desc: play.getDescriptor(), actId: ensureRoman(req.params.act), sceneId: ensureArabic(req.params.scene)});
    }
    else{
        res.end("Play not found.");
    }
});
http.listen(app.get('port'), function () {
    console.log("started on " + app.get('port'))
});
hbs.registerHelper('ifCond', function (v1, operator, v2, options) {

    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});
hbs.registerHelper('htmlLines', function(str) {
    str = hbs.Utils.escapeExpression(str);
    str = str.replace(new RegExp("(.+)", 'g'), '<span>$1</span><br>');
    return new hbs.SafeString(str);
});
hbs.registerHelper('arrToScene', function(str) {
    str = ensureArabic(str) + 1;
    return new hbs.SafeString(str);
});
hbs.registerHelper('arrToAct', function(str) {
    str = ensureRoman(str + 1);
    return new hbs.SafeString(str);
});
function getPlaysWithTag(tag){
    var out = [];
    for(var i = 0; i < plays.length; i++){
        if(plays[i].hasTag(tag)) out.push(plays[i]);
    }
    return out;
}
function getPlayByShortName(shortName){
    for(var i = 0; i < plays.length; i++){
        if(plays[i].getShortName() == shortName){
            return plays[i];
        }
    }
    return null;
}
function ensureRoman(input){
    try{
        return toRoman(input);
    }
    catch(e){
        return input;
    }
}
function ensureArabic(input){
    try{
        return toArabic(input);
    }
    catch(e){
        return input;
    }
}
var Play = function(data){
    data = data.play;
    this.tags = data.head[0].tag;
    this.desc = data.head[0].note[0];
    this.shortName = data.head[0].shortName[0];
    this.title = data.head[0].title[0];
    this.image = data.head[0].image[0];
    this.text = data.text[0];
    var currentAct = 1;
    console.log(util.inspect(this.getTableOfContents(), false, null));
    for(var i = 0; i < this.text.act.length; i++){
        if(this.text.act[i].$.name == null){
            this.text.act[i].$.name = ensureRoman(currentAct);
            this.text.act[i].$.standard = true;
            currentAct++;
        }
    }
};
Play.prototype.hasTag = function (tag) {
    return this.tags.indexOf(tag) > -1;
};
Play.prototype.getTags = function(){
    return this.tags;
};
Play.prototype.getTitle = function(){
    return this.title;
};
Play.prototype.getTextObject = function(){
    return this.text;
};
Play.prototype.getActObject = function(id){
    for(var i = 0; i < this.text.act.length; i++){
        if(this.text.act[i].$.name == id){
            return this.text.act[i];
        }
    }
    return null;
};
Play.prototype.getSceneObject = function(actId, sceneId){
    var act = this.getActObject(actId);
    sceneId = ensureArabic(sceneId)-1;
    return act != null ? (act.scene[sceneId] != null ? act.scene[sceneId] : null) : null;
};
Play.prototype.getDescriptor = function(){
    return {tags: this.tags, desc: this.desc, title: this.title, image: this.image, shortName: this.shortName};
};
Play.prototype.getTableOfContents = function(){
    var out = [];
    var currentAct = 1;
    for(var i = 0; i < this.text.act.length; i++){

        out.push(this.text.act[i].$ || {});
        out[i].scene = [];
        if(this.text.act[i].$.standard == true) {
            out[i].roman = toRoman(currentAct);
            out[i].arabic = currentAct;
            currentAct++;
        }
        for(var j = 0; j < this.text.act[i].scene.length; j++){
            out[i].scene.push(this.text.act[i].scene[j].$);
            out[i].scene[j].roman = toRoman(j+1);
            out[i].scene[j].arabic = j+1;
        }
    }
    return out;
};
Play.prototype.getShortName = function(){
    return this.shortName;
};
