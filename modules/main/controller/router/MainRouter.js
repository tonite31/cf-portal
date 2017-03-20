var request = require('request');
var uuid = require('node-uuid');
var async = require('async');
var uuid = require('node-uuid');

var CFClient = require('../../lib/CFClient');

module.exports = function(app)
{
	var sockets = {};
	app.post('/create_dashboard_link', function(req, res, next)
	{
		if(req.body.type == 'autoscalerDashboard')
		{
			res.end(_config.autoscalerDashboard + '?appId=' + req.body.credentials.appId + '&appName=' + req.body.credentials.appName + '&endpoint=' + req.body.credentials.api_url + '&username=' + req.session.cfdata.username);
		}
		else
		{
			var url = _config[req.body.type];
			if(!url)
			{
				res.status(404).end('dashboard_url not found.');
				return;
			}
			
			if(url.lastIndexOf('/') != url.length-1)
				url += '/';
			
			if(!req.session.tokens)
				req.session.tokens = {};
			
			var secret = uuid.v4();
			
			if(req.session.tokens[req.body.credentials.password])
			{
				secret = req.session.tokens[req.body.credentials.password];
			}
			else
			{
				req.session.tokens[req.body.credentials.password] = {secret : secret};
			}
			
			var param = {};
			param.url = url + 'token';
			param.method = 'post';
			param.form = {secret : secret, credentials : req.body.credentials};
			
			request(param, function(err, response, body)
			{
				if(err)
				{
					
				}
				else
				{
					if(response.statusCode != 200)
					{
						res.status(response.statusCode).end('Cannnot found /token');
					}
					else
					{
						var token = body;
						res.end(url + '?token=' + token);
					}
				}
			});  
		}
	});
	
	var clean = function(data)
	{
		data = data.split('\n\n');
	    if (data.length > 1) {
	        data.splice(0, 1);
	    }
	    var length = data.length;
	    for (var i = 0; i < length; i++) {
	        var value = data[i];
	        value = value.substr(2, value.length - 1);
	        var end = value.indexOf(String.fromCharCode(16));
	        data[i] = value.substr(0, end);
	    }
	    return data.join('\n\n');
	};
	
	app.post('/cf_logs_tail', function(req, res, next)
	{
		var cf = new CFClient(req.session.cfdata);
		if(!cf.isLogin())
		{
			res.statusCode = 302;
			res.end('signin');
			return;
		}

		var url = req.body.url;
		if(!url)
		{
			res.status(500).send({error : 'Url is undefind'});
			return;
		}
		
		if(!req.session.tailLogs)
			req.session.tailLogs = {};
		
		cf.getTailLog(url, function(socket)
		{
			var socketId = uuid.v4();
			
			sockets[socketId] = socket;
			req.session.tailLogs[socketId] = [];
			socket.on('open', function () {
		        console.log('log socket connected');
		    });
		    socket.on('close', function () {
		        console.log('log socket disconnected');
		        sockets[socketId] = null;
		    });
		    socket.on('message', function (data) {
		    	req.session.tailLogs[socketId].push(clean(data.toString()));
		    	console.log("들어가고 있는데 : ", req.session.tailLogs[socketId]);
		    });
		    socket.on('error', function () {
		    	sockets[socketId] = null;
		    	req.session.tailLogs[socketId].push('-- socket error' + JSON.stringify(arguments));
		    	console.log("에러 : ", arguments);
		    });
		    
			res.end(socketId);
		}, function(error)
		{
			console.log(error);
			res.status(500).send({error : error});
		});
	});
	
	app.get('/get_cf_logs_tail', function(req, res, next)
	{
		var socketId = req.query.socketId;
		console.log("소켓 아이디 : ", socketId);
		if(req.session.tailLogs[socketId])
		{
			var log = req.session.tailLogs[socketId];
			console.log("혹시나 : ", log);
			req.session.tailLogs[socketId] = [];
			res.send(log);
		}
		else
		{
			res.end();
		}
	});
	
	app.post('/cf_logs_tail_close', function(req, res, next)
	{
		var socketId = req.body.socketId;
		if(sockets && sockets[socketId])
		{
			sockets[socketId].close();
			delete sockets[socketId];
		}
		
		res.end();
	});
	
//	app.post('/create_dashboard_link', function(req, res, next)
//	{
//		if(!req.session.dashboard)
//			req.session.dashboard = {};
//		
//		var url = _config[req.body.type];
//		if(url.lastIndexOf('/') != url.length-1)
//			url += '/';
//		
//		if(req.session.dashboard[req.body.credentials.password])
//		{
//			res.end(url + '?token=' + req.session.dashboard[req.body.credentials.password].token + '&refresh=true');
//			return;
//		}
//		
//		var param = {};
//		param.url = url + 'dashboard_token';
//		param.form = {credentials : req.body.credentials};
//		param.method = 'POST';
//		
//		request(param, function(err, response, body)
//		{
//			if(err)
//			{
//				console.error('Error: ', err);
//			    res.status(500).send({error : err});
//			}
//			else
//			{
//				req.session.dashboard[req.body.credentials.password] = req.body.credentials;
//				req.session.dashboard[req.body.credentials.password].token = body;
//				
//				res.end(url + '?token=' + body);
//			}
//		});
//	});
	
	app.post('/get_dashboard_credentials', function(req, res, next)
	{
		var token = req.body.token;
		for(var key in req.session.dashboard)
		{
			if(req.session.dashboard[key].token == token)
			{
				res.send(req.session.dashboard[key]);
				break;
			}
		}
	});
	
	app.post('/signout.do', function(req, res, next)
	{
		if(req.session.cfdata)
		{
			delete req.session.cfdata;
		}
		
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
			if(cf.isLogin() || path.indexOf('download') != -1)
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
		if(!url)
		{
			res.status(500).send({error : 'Url is undefind'});
			return;
		}
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
		function(code, error)
		{
			res.status(code).send({error : error});
		});
	});
};

var rendering = function(req, res)
{
	var split = req.path.split('/');
	
	var param = {};
	param['1'] = 'index';
	
	param.username = req.session.cfdata.username;
	if(req.session.cfdata.uaaToken)
	{
		param.accessToken = req.session.cfdata.uaaToken.access_token;
		param.loggingEndpoint = req.session.cfdata.endpoint.logging;
	}
	
	param.host = req.headers.host;
	param.endpoint = _config.endpoint;
	param.redisDashboard = _config.redisDashboard;
	param.swiftDashboard = _config.swiftDashboard;
	
	for(var i=1; i<split.length; i++)
	{
		if(split[i].trim())
			param[i] = split[i];
	}
	
	res.render('layout', param);
};