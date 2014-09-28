/**
 * Module dependencies.
 */

var express = require('../../lib/express');

// Path to our public directory

var pub = __dirname + '/public';

// setup middleware

var app = express();
app.use(express.static(pub));

var MONGODB_URI = 'mongodb://localhost/booklog2';
var mongoose = require('mongoose');

mongoose.connect(MONGODB_URI);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log('MongoDB: connected.');	
});

var postSchema = new mongoose.Schema({
    subject: { type: String, default: ''},
    content: String,

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

postSchema.index({ content: 'text' });

var userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    displayName: { type: String, unique: true },
    email: { type: String, unique: true },
    timeCreated: { type: Date, default: Date.now },
    facebook: {}
});

app.db = {
	posts: mongoose.model('Post', postSchema),
	users: mongoose.model('User', userSchema)
};

// Optional since express defaults to CWD/views

app.set('views', __dirname + '/views');

// Set our default template engine to "jade"
// which prevents the need for extensions
// (although you can still mix and match)
app.set('view engine', 'jade');

var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy;

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new FacebookStrategy({
    clientID: '352593848243689',
    clientSecret: '93339af7a2f219ab8ee052b78c1714d4',
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
	   app.db.users.findOne({"facebook._json.id": profile._json.id}, function(err, user) {
		   	if (!user) {
			  var obj = {
			    username: profile.username,
			    displayName: profile.displayName,
			    email: '',
			    facebook: profile
			   };

			   var doc = new app.db.users(obj);
		   	   doc.save();

		   	   user = doc;
		   	}

		   	return done(null, user); // verify
	   });
  }
));

// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback
app.get('/auth/facebook', passport.authenticate('facebook'));

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { successRedirect: '/',
                                      failureRedirect: '/login' }));

app.all('*', function(req, res, next){
  if (!req.get('Origin')) return next();
  // use "*" here to accept any origin
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'PUT');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  // res.set('Access-Control-Allow-Max-Age', 3600);
  if ('OPTIONS' == req.method) return res.send(200);
  next();
});

app.get('/', function(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		res.render('login');
	}
});

app.get('/', function(req, res) {
	res.render('index');
});

app.get('/download', function(req, res) {
	var events = require('events');
	var workflow = new events.EventEmitter();

	workflow.outcome = {
		success: false,
	};

	workflow.on('vaidate', function() {
		var password = req.query.password;

		if (typeof(req.retries) === 'undefined')
			req.retries = 3;

		if (password === '123456') {
			return workflow.emit('success');
		}

		return workflow.emit('error');
	});

	workflow.on('success', function() {
		workflow.outcome.success = true;
		workflow.outcome.redirect = { 
			url: '/welcome'
		};
		workflow.emit('response');
	});

	workflow.on('error', function() {
		if (req.retries > 0) {
			req.retries--;
			workflow.outcome.retries = req.retries;
			workflow.emit('response');
		}

		workflow.outcome.success = false;
		workflow.emit('response');
	});

	workflow.on('response', function() {
		return res.send(workflow.outcome);
	});

	return workflow.emit('vaidate');
});

app.get('/post', function(req, res) {
	res.render('post');
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/1/post/:id', function(req, res) {	
	var id = req.params.id;
	var posts = req.app.db.posts;

	posts.findOne({_id: id}, function(err, post) {
		res.send({post: post});	
	});
});

app.get('/1/post/tag/:tag', function(req, res) {	
	var tag = req.params.tag;
	var posts = req.app.db.posts;

	posts
    .find( { $text: { $search: tag } } )
    .exec(function(err, posts) {
    	if (err) return console.log(err);
        res.send({posts: posts});
    });
});

app.get('/1/post', function(req, res) {	
	var posts = req.app.db.posts;

	posts
	.find()
	.populate('userId')
	.exec(function(err, posts) {
		res.send({posts: posts});	
	});
});


app.post('/1/post', function(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		res.render('login');
	}
});

app.post('/1/post', function(req, res) {
	var posts = req.app.db.posts;
	var userId = req.user._id;

	var subject;
	var content;

	if (typeof(req.body.subject) === 'undefined') {
		subject = req.query.subject;
		content = req.query.content;
	} else {
		subject = req.body.subject;
		content = req.body.content;		
	}

	var data = {
		userId: userId,
		subject: subject,
		content: content
	};

	var post = new posts(data);
	post.save();

	res.send({ status: 'OK'});
});

app.delete('/1/post', function(req, res) {
	res.send("Delete a post");
});

app.put('/1/post/:postId', function(req, res) {
	var id = req.params.postId;

	res.send("Update a post:" + id);
});

// change this to a better error handler in your code
// sending stacktrace to users in production is not good
app.use(function(err, req, res, next) {
  res.send(err.stack);
});

/* istanbul ignore next */
if (!module.parent) {
  app.listen(3000);
  console.log('Express started on port 3000');
}