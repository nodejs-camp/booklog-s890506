/**
 * Module dependencies.
 */

var express = require('../../lib/express');

// Path to our public directory

var pub = __dirname + '/public';

// setup middleware

var app = express();
app.use(express.static(pub));

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/booklog2');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log('MongoDB: connected.');	
});

var postSchema = new mongoose.Schema({
    subject: { type: String, default: ''},
    content: String
});

app.db = {
	model: mongoose.model('Post', postSchema)
};

// Optional since express defaults to CWD/views

app.set('views', __dirname + '/views');

// Set our default template engine to "jade"
// which prevents the need for extensions
// (although you can still mix and match)
app.set('view engine', 'jade');

var posts = [{
	subject: "Hello",
	content: "Hi !"
}, {
	subject: "World",
	content: "Hi !"
}];

var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
  extended: true
}));

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

app.get('/welcome', function(req, res) {
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
	res.render('post', {
		posts: posts
	});
});

app.get('/1/post/:id', function(req, res) {	
	var id = req.params.id;
	var model = req.app.db.model;

	model.findOne({_id: id}, function(err, post) {
		res.send({post: post});	
	});
});

app.get('/1/post', function(req, res) {	
	var model = req.app.db.model;

	model.find(function(err, posts) {
		res.send({posts: posts});	
	});
});


app.post('/1/post', function(req, res) {
	var model = req.app.db.model;

	var subject;
	var content;

	if (typeof(req.body) === 'undefined') {
		subject = req.query.subject;
		content = req.query.content;
	} else {
		subject = req.body.subject;
		content = req.body.content;		
	}

	var post = {
		subject: subject,
		content: content
	};

	//posts.push(post);
	var card = new model(post);
	card.save();

	res.send({ status: 'OK'});
});

app.delete('/1/post', function(req, res) {
	res.send("Delete a post");
});

app.put('/1/post/:postId', function(req, res) {
	var id = req.params.postId;

	res.send("Update a post: " + id);
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
