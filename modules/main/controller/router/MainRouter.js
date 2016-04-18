var request = require('request');

var uuid = require('node-uuid');

module.exports = function(app)
{
	app.post('/signout', function(req, res, next)
	{
		req.session.loginInfo = {};
		cf.logout();
		
		res.end();
	});
	
	app.get('/signin', function(req, res, next)
	{
		if(cf.isLogin())
		{
			if(req.session.redirect)
				res.redirect(req.session.redirect);
			else
				res.redirect('/organization');
		}
		else
		{
			next();
		}
	});
	
	app.get('/registration/:id', function(req, res, next)
	{
		var password = req.params.id;
		
		if(req.session && req.session.registration)
		{
			if(!req.session.loginInfo)
				req.session.loginInfo = {};
			
			req.session.loginInfo.oldPassword = password;
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
	
	app.get('/*', function(req, res, next)
	{
		var path = req.path;
		
		if(path == '/')
		{
			if(cf.isLogin())
			{
				res.redirect('/organization');
				return;
			}
			
		}
		
		if(path.match(/^\/[a-z0-9\-\_\/]*$/))
		{
			rendering(req, res);
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
		
		var client = new CFClient();
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
	
	app.get('/signout.do', function(req, res, next)
	{
		cf.logout();
	});
	
	app.post('/cf/signin', function(req, res, next)
	{
		if(cf.isLogin())
		{
			if(req.session.redirect)
				res.redirect(req.session.redirect);
			else
				res.redirect('/organization');
		}
		else
		{
			var username = req.body.id;
			var password = req.body.password;
			
			if(!req.session.loginInfo)
				req.session.loginInfo = {};
			
			req.session.loginInfo.oldPassword = password;
			
			cf.setUserInfo(username, password);
			
			var done = function(result)
			{
				if(!req.session)
					req.session = {};
				
				req.session.username = username;
				
				res.send({redirect : req.session.redirect});
			};
			
			var err = function(err)
			{
				console.error('Error: ', err.stack);
			    res.status(500).send({error : err});
			};
			
			cf.login(done, err);
		}
	});
	
	app.post('/cf', function(req, res, next)
	{
		if(!cf.isLogin())
		{
			if(!req.session)
				req.session = {};
			
			req.session.redirect = req.headers.referer;
			
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
			}
		},
		function(error)
		{
			res.send({error : error});
		});
	});
	
	app.post('/mail', function(req, res, next)
	{
		if(!cf.isLogin())
		{
			if(!req.session)
				req.session = {};
			
			req.session.redirect = req.headers.referer;
			
			res.statusCode = 302;
			res.end('signin');
			return;
		}
		
		var hostname = 'http://' + req.headers.host;
		var nodemailer = require('nodemailer');

		//create reusable transporter object using the default SMTP transport
		var transporter = nodemailer.createTransport('smtps://' + _config.mail.username + ':' + _config.mail.password + '@smtp.gmail.com');

		var target = req.body.target;
		var orgGuid = req.body.orgGuid;
		
		var targetList = target.split(',');
		
		var resultMappingList = [];
		
		var client = new CFClient();
		client.setUserInfo(_config.admin.username, _config.admin.password);
		client.login(function()
		{
			var forEach = require('async-foreach').forEach;
			forEach(targetList, function(email, index)
			{
				var done = this.async();
				
				var tempId = uuid.v4();
				client.getUser(email.trim(), function(result)
				{
					if(result && result.totalResults == 0)
					{
						client.createUser(email.trim(), tempId, function(result)
						{
							req.session.registration = {};
							req.session.registration[tempId] = {username : email, id : result.id};
							
							var mailOptions = {
							 from: '"Administrator@ghama.io"', // sender address
							 to: email.trim(), // list of receivers
							 subject: 'Invite to ghama', // Subject line
							 html: '<a target="_blank" href="' + hostname + '/registration/' + tempId + '">Sign up to ghama.</a>' // html body
							};
							
							var url = '/v2/organizations/' + orgGuid + '/auditors';
							var method = 'put';
							
							cf.request(url, method, {}, {username : email}, function(data)
							{
								if(data && data.entity)
								{
									data.entity.username = email;
									data.entity.id = result.id;
									
									resultMappingList.push(data);
									
									transporter.sendMail(mailOptions, function(error, info)
									{
									    if(error){
									        res.status(500).send({error : error});
									    }
									    
									    done();
									});
								}
							},
							function(error)
							{
								 res.status(500).send({error : error});
							});
						});
					}
				});
			},
			function()
			{
				res.send({resources : resultMappingList});
			});
		},
		function(err)
		{
			res.send({error : err});
		});
	});
	
	app.post('/users/password', function(req, res, next)
	{
		if(!cf.isLogin())
		{
			if(!req.session)
				req.session = {};
			
			req.session.redirect = req.headers.referer;
			
			res.statusCode = 302;
			res.end('signin');
			return;
		}
		
		var username = req.body.username;
		var id = req.body.id;
		var oldPassword = req.session.loginInfo.oldPassword;
		var password = req.body.password;
		
		cf.setUserInfo(username, oldPassword);
		cf.login(function(result)
		{
			if(!req.session)
				req.session = {};
			
			req.session.username = username;
			
			cf.changePassword(id, password, function(result)
			{
				if(result)
				{
					res.send(result);
				}
			},
			function(error)
			{
				if(error)
				{
					res.status(500).send({error : error});
				}
			});
		},
		function(error)
		{
			if(error)
				res.status(500).send({error : error});
		});
	});
	
	app.post('/users/getUser', function(req, res, next)
	{
		if(!cf.isLogin())
		{
			if(!req.session)
				req.session = {};
			
			req.session.redirect = req.headers.referer;
			
			res.statusCode = 302;
			res.end('signin');
			return;
		}
		
		var username = req.body.username;
		
		var client = new CFClient();
		client.setUserInfo(_config.admin.username, _config.admin.password);
		client.login(function()
		{
			client.getUser(username, function(result)
			{
				res.send(result);
			},
			function(err)
			{
				res.status(500).send({error : err});
			});
		},
		function(err)
		{
			res.status(500).send({error : err});
		});
	});
	
	app.post('/users/createUser', function(req, res, next)
	{
		var email = req.body.email;
		var password = req.body.password;
		
		var client = new CFClient();
		client.setUserInfo(_config.admin.username, _config.admin.password);
		client.login(function()
		{
			client.createUser(email, password, function(result)
			{
				res.send(result);
			},
			function(err)
			{
				res.status(500).send({error : err});
			});
		},
		function(err)
		{
			res.status(500).send({error : err});
		});
	});
	
	app.post('/users/updateUser', function(req, res, next)
	{
		if(!cf.isLogin())
		{
			if(!req.session)
				req.session = {};
			
			req.session.redirect = req.headers.referer;
			
			res.statusCode = 302;
			res.end('signin');
			return;
		}
		
		var id = req.body.id;
		var name = req.body.name;
		
		var client = new CFClient();
		client.setUserInfo(_config.admin.username, _config.admin.password);
		client.login(function()
		{
			client.updateUser({id : id, name : name}, function(result)
			{
				res.send(result);
			},
			function(err)
			{
				res.status(500).send({error : err});
			});
		},
		function(err)
		{
			res.status(500).send({error : err});
		});
	});
	
	app.post('/users/delete', function(req, res, next)
	{
		if(!cf.isLogin())
		{
			if(!req.session)
				req.session = {};
			
			req.session.redirect = req.headers.referer;
			
			res.statusCode = 302;
			res.end('signin');
			return;
		}
		
		var id = req.body.id;
		
		var client = new CFClient();
		client.setUserInfo(_config.admin.username, _config.admin.password);
		client.login(function()
		{
			client.deleteUser(id, function(result)
			{
				res.send(result);
			},
			function(err)
			{
				res.status(500).send({error : err});
			});
		},
		function(err)
		{
			res.status(500).send({error : err});
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
	param.username = req.session.username;
	param.tailLogServer = cf.endpoint.logging_socket;
	
	for(var i=1; i<split.length; i++)
	{
		if(split[i].trim())
			param[i] = split[i];
	}
	
	res.render('layout', param);
};