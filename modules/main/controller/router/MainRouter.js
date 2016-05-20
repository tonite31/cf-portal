var request = require('request');
var uuid = require('node-uuid');
var async = require('async');

var CFClient = require('../../lib/CFClient');

module.exports = function(app)
{
	app.post('/signout.do', function(req, res, next)
	{
		if(req.session.cfdata)
			req.session.cfdata = null;
		
		res.end();
	});
	
	app.get('/registration/:id', function(req, res, next)
	{
		var password = req.params.id;
		
		if(req.session && req.session.registration)
		{
			var cf = new CFClient(req.session.cfdata);
			cf.oldPassword = password;
			var data = req.session.registration[password];
			if(data)
				res.render('layout', {1 : 'signup_for_invite', id : data.id, username : data.username});
			else
				res.redirect('/expired');
		}
		else
		{
			res.redirect('/expired');
		}
	});
	
	app.get('/:type(signin|signup|expired)', function(req, res, next)
	{
		if(!req.session)
			req.session = {};
		
		if(!req.session.cfdata)
			req.session.cfdata = {};

		var cf = new CFClient(req.session.cfdata);
		if(cf.isLogin())
		{
			res.redirect('/organization');
		}
		else
		{
			rendering(req, res);
		}
	});
	
	app.get('/*', function(req, res, next)
	{
		if(!req.session)
			req.session = {};
		
		if(!req.session.cfdata)
			req.session.cfdata = {};
		
		var cf = new CFClient(req.session.cfdata);
		var path = req.path;
		if(path == '/')
		{
			if(cf.isLogin())
			{
				res.redirect('/organization');
				return;
			}
			else
			{
				rendering(req, res);
				return;
			}
		}
		
		if(path.match(/^\/[a-z0-9\-\_\/]*$/))
		{
			if(cf.isLogin())
			{
				rendering(req, res);
			}
			else
			{
				res.redirect('/');
				return;
			}
		}
		else
		{
			next();
		}
	});
	
	app.post('/cf/users', function(req, res, next)
	{
		var url = req.body.url;
		var method = req.body.method;
		var headers = req.body.headers;
		var data = req.body.data;
		
		var client = new CFClient({endpoint : req.session.cfdata.endpoint});
		client.setUserInfo(_config.admin.username, _config.admin.password);
		client.login(function()
		{
			client.users(url, method, headers, data, function(result)
			{
				if(result)
					res.send(result);
			},
			function(err)
			{
				res.send({error : err});
			});
		},
		function(err)
		{
			res.send({error : err});
		});
	});
	
	app.post('/cf/signin', function(req, res, next)
	{
		var cf = new CFClient(req.session.cfdata);
		if(cf.isLogin())
		{
			res.redirect('/organization');
		}
		else
		{
			var username = req.body.id;
			var password = req.body.password;
			
			cf.oldPassword = password;
			
			cf.setUserInfo(username, password);
			
			var done = function(result)
			{
				req.session.cfdata = cf.getData();
				res.send({});
			};
			
			var err = function(err)
			{
				console.error('Error: ', err);
			    res.status(500).send({error : err});
			};
			
			cf.login(done, err);
		}
	});
	
	app.post('/cf', function(req, res, next)
	{
		var cf = new CFClient(req.session.cfdata);
		if(!cf.isLogin())
		{
			res.statusCode = 302;
			res.end('signin');
			return;
		}
		
		var url = req.body.url;
		var method = req.body.method;
		var headers = req.body.headers;
		var data = req.body.form;
		
		cf.request(url, method, headers, data, function(data)
		{
			try
			{
				if(typeof data == 'object')
					data = JSON.stringify(data);

				res.end(data);
			}
			catch(err)
			{
				console.log(err);
				res.status(500).send({error : err});
			}
		},
		function(error)
		{
			res.send({error : error});
		});
	});
};

var rendering = function(req, res)
{
	var split = req.path.split('/');
	
	var param = {};
	param['1'] = 'index';
	param['3'] = 'space';
	param['5'] = 'apps';
	param.username = req.session.cfdata.username;
	if(req.session.cfdata.endpoint)
		param.tailLogServer = req.session.cfdata.endpoint.logging_socket;
	
	for(var i=1; i<split.length; i++)
	{
		if(split[i].trim())
			param[i] = split[i];
	}
	
	res.render('layout', param);
};