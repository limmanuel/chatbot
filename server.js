var express = require('express');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var session = require('express-session');
var flash = require('connect-flash');
var hbs = require('express-handlebars');
var Handlebars = require('handlebars');
const request = require('request');
const apiai = require('apiai');
const aiapp = apiai("7e38a393c16748bd993b653c33548ee6");
const apiaitoken = "7e38a393c16748bd993b653c33548ee6";
const secret = require('./secret.js');
var FB = require('fb');

passport.use(new Strategy({
    clientID: secret.CLIENT.ID,
    clientSecret: secret.CLIENT.SECRET,
    callbackURL: secret.CLIENT.URL,
    profileFields: ['id', 'displayName', 'photos', 'email']
  },
  function(accessToken, refreshToken, profile, cb) {
    FB.setAccessToken(accessToken);
    return cb(null, profile);
  }));
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


// Create a new Express application.
var app = express();

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());
app.use(function(req, res, next){
    res.locals.question = req.flash('question');
    res.locals.answer = req.flash('answer');
    next();
});




var mongoose = require('mongoose');

mongoose.connect(secret.mongoURL);
var db = mongoose.connection;
var ObjectID = require('mongodb').ObjectID;
var mongoClient = require('mongodb').MongoClient;
var url = secret.mongoURL;

var port = process.env.PORT || 8082;

mongoClient.connect(url, function(err, database){
  if(err){console.log(err);};
  db=database;
  User = db.collection('user');
  Page = db.collection('page');

  app.listen(port, function(){
    console.log("Connected to port: " + port);
  });
});







// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.engine('hbs', hbs({extname : 'hbs', defaultLayout: 'layout', layoutDir: __dirname+'/views/layouts'}))
app.set('view engine', 'hbs');

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('body-parser').json());
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());


FB.options({version: 'v2.11'});
var access_token = FB.getAccessToken();




let Users = require('./model/user.js');



app.get('/', function(req,res){
    res.render('login');
})

// Define routes.
app.get('/dashboard/:userid', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
  console.log('==================/================');
  if(req.user){
          console.log("eUser"+req.params.userid);
    Users.getUser(req.params.userid, function(err, curruser){
      FB.api("/"+req.params.userid+"/accounts?fields=access_token,name,is_webhooks_subscribed,picture", function (fbres) {
        if(!fbres || fbres.error) {
         console.log(!fbres ? 'error occurred' : fbres.error);
         return;
        }
        console.log("=========logged in========");
        console.log(req.user.id +" "+req.params.userid);
        console.log(fbres);
        //console.log(JSON.stringify(fbres));
        Users.getUsers(function(err,userdb){
          //console.log("userdb"+JSON.stringify(userdb));
          if(userdb.length>0){
            var exist = false;
            userdb.forEach(function(user){
              //console.log("user"+user);
              if(user){
                if(user.user_id == req.user.id){ exist=true; console.log("Already Exist: " + req.user.id)} 
              }
            });
            if(!(exist)) {
              var newUser = new Users({
                user_id: req.user.id,
                user_name: req.user.displayName,
                access_token: FB.getAccessToken(),
                pages:[]
              });
              Users.newUser(newUser, function(err,status){});
            }
            if(fbres.data.length>0){
              fbres.data.forEach(function(pages){
                Users.getUsersWithPage(pages.id, function(err, result){
                  //console.log(result);
                  if(result){} else {
                    var page = {
                      page_id: pages.id,
                      page_name: pages.name,
                      subscribed: pages.is_webhooks_subscribed,
                      page_token: pages.access_token,
                      qnamaker: {
                        kbId: "",
                        urls: []
                      }
                    }
                    Users.addPage(req.user.id, page, function(err, data){});
                  }
                });
              });
            }
          } else {
            console.log("wala2");
            var newUser = new Users({
              user_id: req.user.id,
              user_name: req.user.displayName,
              access_token: FB.getAccessToken(),
              pages:[]

            });
            Users.newUser(newUser, function(err,status){
              if(fbres.data.length>0){
                fbres.data.forEach(function(pages){
                  var page = {
                    page_id: pages.id,
                    page_name: pages.name,
                    subscribed: pages.is_webhooks_subscribed,
                    page_token: pages.access_token,
                    qnamaker: {
                      kbId: "",
                      urls: []
                    }
                  }
                  Users.addPage(req.user.id, page, function(err, data){});
                });
              }
            });
          }
        });

        res.render('home', { pages: fbres,
          curruser: curruser,
          user: req.user,
          userJSON: JSON.stringify(req.user),
          question: req.query.question,
          answer: req.query.answer
        });
      });
    });
  } else {
    req.logout();
    res.render('home');
  }
});
app.get('/dashboard/:userid/page/:pageid', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
  console.log('==================/pagepagepgaeg================');
  if(req.user){
          console.log("eUser"+req.params.userid);
    Users.getUser(req.params.userid, function(err, curruser){
      FB.api("/"+req.params.userid+"/accounts?fields=access_token,name,is_webhooks_subscribed,picture", function (fbres) {
        if(!fbres || fbres.error) {
         console.log(!fbres ? 'error occurred' : fbres.error);
         return;
        }
        console.log("pageidpageidageidp"+req.params.pageid);
        res.render('page', { pages: fbres,
          curruser: curruser,
          user: req.user,
          userJSON: JSON.stringify(req.user),
          pageid: req.params.pageid
        });
      });
    });
  } else {
    req.logout();
    res.render('home');
  }
});

app.post('/dashboard/:userid/page/:pageid/url', (req,res)=>{
  if(req.body.lasturl=='none'){
    var create=[];
    console.log("Creating KB...");
    // Define an demo object with properties and values. This object will be used for POST request.
    var qnaurl = req.body.url;
    var page_id = req.body.idss;
    var user_id = req.user.id;
    var kbname = req.body.name;
    var create=JSON.stringify({
      "name": kbname,
      "urls": [qnaurl]
    });
    Users.getUser(req.params.userid, function(err, user){
      var foundurl = false;
      var kbexist = false;
      var kbIds = "";
      user.pages.forEach(function(page){
        if(page.page_id == page_id){
          if(page.qnamaker.urls.length>0){
            page.qnamaker.urls.forEach(function(urls){
              if(page.qnamaker.kbid!="" || page.qnamaker.kbid || page.qnamaker.kbid!=null){
                kbexist = true;
                if(kbexist){
                  kbIds = page.qnamaker.kbid;
                  console.log(kbIds);
                }
              }
              if(urls.url==qnaurl){
                foundurl=true;
              }
            });
          }
        }
      });
      console.log(foundurl + "===" + kbexist);
      if(kbexist==false){
        console.log("CREATING NEW KB");
        request({
          uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/create",
          method: "POST",
          headers:{
            'Ocp-Apim-Subscription-Key':  secret.qnaMakerSK,
            'Content-Type':'application/json'
          },
          body: create
        }, function (error, response, body){
            var kbId = JSON.parse(response.body).kbId;
            console.log("CREATE KB.... "+JSON.stringify(JSON.parse(response.body)));
          if(kbId){
            var qna = {
              kbid: kbId,
              urls: [{
                url: qnaurl
              }]
            };
            console.log(kbId);
            var train=[];
            console.log("Training QnA URL...");
            // Define an demo object with properties and values. This object will be used for POST request.

            var train=JSON.stringify({
              "feedbackRecords": [{
                "userId": "1","userQuestion": "hi","kbQuestion": "Hi","kbAnswer": "Hello"
              }]
            });
            request({
              uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/"+kbId,
              method: "PATCH",
              headers:{
                'Ocp-Apim-Subscription-Key':  secret.qnaMakerSK,
                'Content-Type':'application/json'
              },
              body: train
            }, function (error, response, body){
                console.log(response.body);
                console.log("Publishing QnA URL...");
                // Define an demo object with properties and values. This object will be used for POST request.


                request({
                  uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/"+kbId,
                  method: "PUT",
                  headers:{
                    'Ocp-Apim-Subscription-Key':  secret.qnaMakerSK,
                    'Content-Type':'application/json'
                  }
                }, function (error, response, body){
                    console.log(response.body);
                    Users.createQna(user_id, page_id, qna, function(err, data){
                      res.redirect("/dashboard/"+req.user.id+"/page/"+req.params.pageid);
                    });
                });
            });
          }
        });
      }
    });

  } else {

    var create=[];
    console.log("Adding url...");
    // Define an demo object with properties and values. This object will be used for POST request.
    var qnaurl = req.body.url;
    var page_id = req.body.idss;
    var user_id = req.user.id;
    var kbname = req.body.name;
    var lasturl = req.body.lasturl;
    Users.getUser(req.params.userid, function(err, user){
      var foundurl = false;
      var kbexist = false;
      var kbIds = "";
      user.pages.forEach(function(page){
        if(page.page_id == page_id){
          if(page.qnamaker.urls.length>0){
            page.qnamaker.urls.forEach(function(urls){
              if(page.qnamaker.kbid!="" || page.qnamaker.kbid || page.qnamaker.kbid!=null){
                kbexist = true;
                if(kbexist){
                  kbIds = page.qnamaker.kbid;
                  console.log(kbIds);
                }
              }
              if(urls.url==qnaurl){
                foundurl=true;
              }
            });
          }
        }
      });
      console.log(foundurl + "===" + kbexist);
      if(kbexist && !(foundurl)){
        console.log("ADDING URL"+kbIds);
        var addurl = JSON.stringify({
          "add": {
            "urls": [qnaurl]
          },
          "delete": {
            "urls": [lasturl]
          }
        });
        request({
          uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/"+kbIds,
          method: "PATCH",
          headers:{
            'Ocp-Apim-Subscription-Key': secret.qnaMakerSK,
            'Content-Type':'application/json'
          },
          body: addurl
        }, function (error, response, body){
            console.log(response.body);
            var train=[];
            console.log("Training QnA URL...");
            // Define an demo object with properties and values. This object will be used for POST request.

            var train=JSON.stringify({
              "feedbackRecords": [{
                "userId": "1","userQuestion": "hi","kbQuestion": "Hi","kbAnswer": "Hello"
              }]
            });
            request({
              uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/"+kbIds,
              method: "PATCH",
              headers:{
                'Ocp-Apim-Subscription-Key':  secret.qnaMakerSK,
                'Content-Type':'application/json'
              },
              body: train
            }, function (error, response, body){
                console.log(response.body);
                console.log("Publishing QnA URL...");
                // Define an demo object with properties and values. This object will be used for POST request.


                request({
                  uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/"+kbIds,
                  method: "PUT",
                  headers:{
                    'Ocp-Apim-Subscription-Key':  secret.qnaMakerSK,
                    'Content-Type':'application/json'
                  }
                }, function (error, response, body){
                    console.log(response.body);
                    Users.addQnaUrl(user_id, page_id, {url: qnaurl}, function(err, done){
                      res.redirect("/dashboard/"+req.user.id+"/page/"+req.params.pageid);
                    });
                });
            });
        });
      }
    });
  }
});







app.post('/dashboard/:userid/page/:pageid/pair', (req,res)=>{
  if(req.body.lasturl=='none'){
    var create=[];
    console.log("Creating KB...");
    // Define an demo object with properties and values. This object will be used for POST request.
    var qnaquestion = req.body.question;
    var qnaanswer = req.body.answer;
    var page_id = req.body.idss;
    var user_id = req.user.id;
    var kbname = req.body.name;
    var create=JSON.stringify({
      "name": kbname,
      "qnaPairs": [
        {"answer": qnaanswer,
        "question": qnaquestion}
      ]
    });
    Users.getUser(req.params.userid, function(err, user){
      var foundurl = false;
      var kbexist = false;
      var kbIds = "";
      user.pages.forEach(function(page){
        if(page.page_id == page_id){
          if(page.qnamaker.urls.length>0){
            page.qnamaker.urls.forEach(function(urls){
              if(page.qnamaker.kbid!="" || page.qnamaker.kbid || page.qnamaker.kbid!=null){
                kbexist = true;
                if(kbexist){
                  kbIds = page.qnamaker.kbid;
                  console.log(kbIds);
                }
              }
              if(urls.url==qnaurl){
                foundurl=true;
              }
            });
          }
        }
      });
      console.log(foundurl + "===" + kbexist);
      if(kbexist==false){
        console.log("CREATING NEW KB");
        request({
          uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/create",
          method: "POST",
          headers:{
            'Ocp-Apim-Subscription-Key':  secret.qnaMakerSK,
            'Content-Type':'application/json'
          },
          body: create
        }, function (error, response, body){
            var kbId = JSON.parse(response.body).kbId;
            console.log("CREATE KB.... "+JSON.stringify(JSON.parse(response.body)));
          if(kbId){
            var qna = {
              kbid: kbId,
              urls: [{
                url: qnaurl
              }]
            };
            console.log(kbId);
            var train=[];
            console.log("Training QnA URL...");
            // Define an demo object with properties and values. This object will be used for POST request.

            var train=JSON.stringify({
              "feedbackRecords": [{
                "userId": "1","userQuestion": "hi","kbQuestion": "Hi","kbAnswer": "Hello"
              }]
            });
            request({
              uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/"+kbId,
              method: "PATCH",
              headers:{
                'Ocp-Apim-Subscription-Key':  secret.qnaMakerSK,
                'Content-Type':'application/json'
              },
              body: train
            }, function (error, response, body){
                console.log(response.body);
                console.log("Publishing QnA URL...");
                // Define an demo object with properties and values. This object will be used for POST request.


                request({
                  uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/"+kbId,
                  method: "PUT",
                  headers:{
                    'Ocp-Apim-Subscription-Key':  secret.qnaMakerSK,
                    'Content-Type':'application/json'
                  }
                }, function (error, response, body){
                    console.log(response.body);
                    Users.createQna(user_id, page_id, qna, function(err, data){
                      res.redirect("/dashboard/"+req.user.id+"/page/"+req.params.pageid);
                    });
                });
            });
          }
        });
      }
    });

  } else {

    var create=[];
    console.log("Adding url...");
    // Define an demo object with properties and values. This object will be used for POST request.
    var qnaurl = req.body.url;
    var page_id = req.body.idss;
    var user_id = req.user.id;
    var kbname = req.body.name;
    var lasturl = req.body.lasturl;
    Users.getUser(req.params.userid, function(err, user){
      var foundurl = false;
      var kbexist = false;
      var kbIds = "";
      user.pages.forEach(function(page){
        if(page.page_id == page_id){
          if(page.qnamaker.urls.length>0){
            page.qnamaker.urls.forEach(function(urls){
              if(page.qnamaker.kbid!="" || page.qnamaker.kbid || page.qnamaker.kbid!=null){
                kbexist = true;
                if(kbexist){
                  kbIds = page.qnamaker.kbid;
                  console.log(kbIds);
                }
              }
              if(urls.url==qnaurl){
                foundurl=true;
              }
            });
          }
        }
      });
      console.log(foundurl + "===" + kbexist);
      if(kbexist && !(foundurl)){
        console.log("ADDING URL"+kbIds);
        var addpair = JSON.stringify({
          "add": {
            "qnaPairs": [{
              "answer": qnaanswer,
              "question": qnaquestion
            }]
          }
        });
        request({
          uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/"+kbIds,
          method: "PATCH",
          headers:{
            'Ocp-Apim-Subscription-Key': secret.qnaMakerSK,
            'Content-Type':'application/json'
          },
          body: addpair
        }, function (error, response, body){
            console.log(response.body);
            var train=[];
            console.log("Training QnA URL...");
            // Define an demo object with properties and values. This object will be used for POST request.

            var train=JSON.stringify({
              "feedbackRecords": [{
                "userId": "1","userQuestion": "hi","kbQuestion": "Hi","kbAnswer": "Hello"
              }]
            });
            request({
              uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/"+kbIds,
              method: "PATCH",
              headers:{
                'Ocp-Apim-Subscription-Key':  secret.qnaMakerSK,
                'Content-Type':'application/json'
              },
              body: train
            }, function (error, response, body){
                console.log(response.body);
                console.log("Publishing QnA URL...");
                // Define an demo object with properties and values. This object will be used for POST request.


                request({
                  uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/"+kbIds,
                  method: "PUT",
                  headers:{
                    'Ocp-Apim-Subscription-Key':  secret.qnaMakerSK,
                    'Content-Type':'application/json'
                  }
                }, function (error, response, body){
                    console.log(response.body);
                    Users.addQnaUrl(user_id, page_id, {url: qnaurl}, function(err, done){
                      res.redirect("/dashboard/"+req.user.id+"/page/"+req.params.pageid);
                    });
                });
            });
        });
      }
    });
  }
});









app.post('/:userid/subscribed', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
  console.log('==================/subscribed/================');
  var subs = true;
  if(req.body.subs=="true"){
    subs=false;
  } else if(req.body.subs=="false"){
    subs = true;
  }
  var requestJSON = {
    url: 'https://graph.facebook.com/v2.6/'+req.body.ids+'?fields=is_webhooks_subscribed',
    qs: { access_token: req.body.ats},
    method: 'POST',
    json:{
      is_webhooks_subscribed: subs,
      id: req.body.ids
    }
  };
  request(requestJSON, function(error, response, body) {
    Users.updateSubscription(req.user.id, req.body.ids, subs, function(err, status){ if(err){console.log(err)}console.log("updated")});
    if (error) {
        console.log('Error sending messages: ', error)
    } else if (response.body.error) {
        console.log('Error: ', response.body.error)
      }
  });
  res.redirect("/dashboard/"+req.user.id);
});

app.get('/dashboard/:userid/details/:pageid', require('connect-ensure-login').ensureLoggedIn(), function(req,res){
  Users.getUser(req.params.userid, function(err, curruser){
    FB.api("/"+req.params.pageid, function (page) {
      if(!page || page.error) {
       console.log(!page ? 'error occurred' : page.error);
       return;
      }
      res.render('page', {
        user: req.user,
        curruser:curruser,
        page: page
      });
    });
  });
});

app.post('/dashboard/:userid/page/:pageid/message', function(req,res){
  var pageid = req.params.pageid;
  var message = req.body.message;
  Users.getUser(req.params.userid, function(err, user){
    if(user.pages.length>0){
      user.pages.forEach(function(page){
        if(page.page_id == pageid){
          if(page.qnamaker.kbid){
            var kbId = page.qnamaker.kbid;
            console.log(kbId);
            var body=[];
            console.log("Doing the Post Operations...");
            // Define an demo object with properties and values. This object will be used for POST request.

            var body=JSON.stringify({
                "question": message,
                "top": 1
            });

            request({
              uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/"+kbId+"/generateAnswer",
              method: "POST",
              headers:{
                'Ocp-Apim-Subscription-Key':  secret.qnaMakerSK,
                'Content-Type':'application/json'
              },
            body: body
            }, function (error, response, body){
              console.log(response.body);
              req.flash('question', message);
              req.flash('answer', JSON.parse(response.body).answers[0].answer);
              res.redirect('/dashboard/'+req.params.userid+'/page/'+pageid);
            });
          } else {
            req.flash('question', message);
            req.flash('answer', 'No QnA Response');
            res.redirect('/dashboard/'+req.params.userid+'/page/'+pageid);
          }
        }
      });
    }
  });
});

app.get('/settings/:userid', require('connect-ensure-login').ensureLoggedIn(), function(req,res){
  Users.getUser(req.params.userid, function(err, curruser){
    FB.api("/"+req.params.userid, function (user) {
      if(!user || user.error) {
       console.log(!user ? 'error occurred' : user.error);
       return;
      }
      res.render('profile', {
        user: req.user,
        curruser:curruser,
        fbuser: user
      });
    });
  });
});

app.get('/webhook/', (req, res) => {
  console.log("Verify");
  const hubChallenge = req.query['hub.challenge'];
  const hubMode = req.query['hub.mode'];
  const verifyTokenMatches = (req.query['hub.verify_token'] === 'Hello');
  if (hubMode && verifyTokenMatches) {
    res.status(200).send(hubChallenge);
  } else {
    res.status(403).end();
  }
});

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
      let event = req.body.entry[0].messaging[i]
      let sender = event.sender.id
      if (event.message && event.message.text) {
        console.log("Message Received")
        //processMessage(event);
        qnaMaker(event);
      }
    }
    res.sendStatus(200)
})






//apiai
function processMessage(event){
  const senderId = event.sender.id;
  const message = event.message.text;
  const recipientId = event.recipient.id;
  Users.getUsersWithPage(recipientId, function(err, user){
    if(user.pages.length>0){
      user.pages.forEach(function(page){
        if(page.page_id == recipientId){
          const apiaiSession = aiapp.textRequest(message, {sessionId: page.page_name});

          apiaiSession.on('response', (response) => {

            if(response.result.metadata.intentName === "next"){
              const num = response.result.parameters.num;
              const num1 = num.split('+').length;
              sendTextMessage(senderId, num1, page.page_token);
            } else if(response.result.metadata.intentName === "Copy"){
              request({
                  url: 'https://api.api.ai/v1/contexts?sessionId='+response.sessionId,
                  method: 'POST',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer '+ apiaitoken
                  },
                  body: JSON.stringify({
                    name: "copiedData",
                    lifespan: 2,
                    parameters: {copy: response.result.resolvedQuery}
                  }),
                }, function(error, response, body) {
                  if (error) {
                      console.log('Error sending messages: ', error)
                  } else if (response.body.error) {
                      console.log('Error: ', response.body.error)
                    }
                });
              sendTextMessage(senderId, "Okay", page.page_token);
            } else if(response.result.metadata.intentName === "Copy - copy"){
              const copied = response.result.fulfillment.speech;
              if (response.result.resolvedQuery == "stop"){
                copied = "";
                sendTextMessage(senderId, "Ok, I'll stop", page.page_token);
              } else {
                request({
                    url: 'https://api.api.ai/v1/contexts?sessionId='+response.sessionId,
                    method: 'POST',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/json',
                      Authorization: 'Bearer '+ apiaitoken
                    },
                    body: JSON.stringify({
                      name: "copiedData",
                      lifespan: 1,
                      parameters: {copy: response.result.resolvedQuery}
                    }),
                }, function(error, response, body) {
                  if (error) {
                      console.log('Error sending messages: ', error)
                  } else if (response.body.error) {
                      console.log('Error: ', response.body.error)
                    }
                  })
                sendTextMessage(senderId, copied, page.page_token);
              }
            } else if(response.result.metadata.intentName === "stop"){
              response.result.parameters = {};
              sendTextMessage(senderId, "Okay, I'll Stop", page.page_token);
            } else if(response.result.metadata.intentName === "Default Fallback Intent"){
              request({
                  url: 'https://api.api.ai/v1/contexts?sessionId='+response.sessionId,
                  method: 'POST',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer '+ apiaitoken
                  },
                  body: JSON.stringify({
                    resetContext: true
                  }),
                }, function(error, response, body) {
                  if (error) {
                      console.log('Error sending messages: ', error)
                  } else if (response.body.error) {
                      console.log('Error: ', response.body.error)
                    }
                });
              const result = response.result.fulfillment.speech;
              sendTextMessage(senderId, result,page.page_token);
            } else {
              const result = response.result.fulfillment.speech;
              sendTextMessage(senderId, result,page.page_token);
            }
          });
          apiaiSession.on('error', error => console.log(error));
          apiaiSession.end();
        }
      });
    }
  });
};


function sendTextMessage(sender, text, token) {
  let messageData = { text:text }
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token: token},
    method: 'POST',
  json: {
    recipient: {id:sender},
    message: messageData,
  }
  }, function(error, response, body) {
    if (error) {
        console.log('Error sending messages: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}


function qnaMaker(event){
  
  const senderId = event.sender.id;
  const message = event.message.text;
  const recipientId = event.recipient.id;
  Users.getUsersWithPage(recipientId, function(err, user){
    if(user.pages.length>0){
      user.pages.forEach(function(page){
        if(page.page_id == recipientId){
          if(page.qnamaker.kbid){
            var kbId = page.qnamaker.kbid;
            console.log(kbId);
            var body=[];
            console.log("Doing the Post Operations...");
            // Define an demo object with properties and values. This object will be used for POST request.

            var body=JSON.stringify({
                "question": message,
                "top": 1
            });

            request({
              uri:"https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/"+kbId+"/generateAnswer",
              method: "POST",
              headers:{
                'Ocp-Apim-Subscription-Key':  secret.qnaMakerSK,
                'Content-Type':'application/json'
              },
            body: body
            }, function (error, response, body){
              if (error) {
                processMessage(event);
              } else if (response.body.error) {
                processMessage(event);
              } else if(JSON.parse(response.body).answers[0].answer == "No good match found in the KB"){
                processMessage(event);
              } else {
                console.log(response.body);
                sendTextMessage(senderId, JSON.parse(response.body).answers[0].answer, page.page_token);
              }
            });
          } else {
            processMessage(event);
          }
        }
      });
    }
  });
}

app.get('/login', function(req, res){
  console.log('==================login================');
  res.render('login');
});

app.get('/login/facebook', passport.authenticate('facebook', { scope: ['manage_pages', 'pages_messaging', 'pages_messaging_subscriptions'] }));

app.get('/login/facebook/return', passport.authenticate('facebook', { failureRedirect: '/' }),function(req, res) {
  console.log('===================return===============');
  console.log(req.user);
  res.redirect("/dashboard/"+req.user.id);
});
app.get('/:page/:userid/logout', function(req, res) {
  req.logout(); 
  res.redirect('/');
});
app.get('/profile/:userid', require('connect-ensure-login').ensureLoggedIn(), function(req, res){
  console.log(req.user);
    res.render('profile', { user: req.user });
});

Handlebars.registerHelper('equal', function(lvalue, rvalue, options) {
    if (arguments.length < 3)
        throw new Error("Handlebars Helper equal needs 2 parameters");
    if( lvalue!==rvalue ) {
        return options.inverse(this);
    } else {
        return options.fn(this);
    }
});
