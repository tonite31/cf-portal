var Pumpkin = require('nodejs-pumpkin');

module.exports = function(app)
{
	app.post('/users/password', function(req, res, next)
	{
		var cf = new CFClient(req.session.cfdata);
		if(!cf.isLogin())
		{
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
		var cf = new CFClient(req.session.cfdata);
		if(!cf.isLogin())
		{
			res.statusCode = 302;
			res.end('signin');
			return;
		}
		
		var username = req.body.username;
		
		var client = new CFClient({endpoint : req.session.cfdata.endpoint});
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
		
		var client = new CFClient({endpoint : req.session.cfdata.endpoint});
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
		var cf = new CFClient(req.session.cfdata);
		if(!cf.isLogin())
		{
			res.statusCode = 302;
			res.end('signin');
			return;
		}
		
		var id = req.body.id;
		var name = req.body.name;
		
		var client = new CFClient({endpoint : req.session.cfdata.endpoint});
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
		var cf = new CFClient(req.session.cfdata);
		if(!cf.isLogin())
		{
			res.statusCode = 302;
			res.end('signin');
			return;
		}
		
		var id = req.body.id;
		
		var client = new CFClient({endpoint : req.session.cfdata.endpoint});
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
	
	app.post('/users/createFirstOrg', function(req, res, next)
	{
		var cf = new CFClient(req.session.cfdata);
		if(!cf.isLogin())
		{
			res.statusCode = 302;
			res.end('signin');
			return;
		}
		
		var username = req.session.cfdata.username;
		var quota_definition_guid = req.body.quota_definition_guid;
		
		var client = new CFClient({endpoint : req.session.cfdata.endpoint});
		client.setUserInfo(_config.admin.username, _config.admin.password);
		client.login(function()
		{
			client.getUser(username, function(data)
			{
				var user = data.resources[0];
				client.request('/v2/organizations?q=user_guid:' + user.id, 'GET', null, null, function(data)
				{
					if(typeof data == 'string')
						data = JSON.parse(data);
					
					if(data.resources.length == 0)
					{
						client.request('/v2/organizations', 'POST', null, {name : username + "_Org", quota_definition_guid : quota_definition_guid}, function(data)
						{
							try
							{
								if(typeof data == 'string')
									data = JSON.parse(data);
								
								var orgId = data.metadata.guid;
								client.request('/v2/organizations/' + orgId + '/managers/' + user.id, 'PUT', null, null, function()
								{
									client.request('/v2/spaces', 'POST', null, {organization_guid : orgId, name : 'dev'}, function(result)
									{
										if(typeof result == 'string')
											result = JSON.parse(result);
										
										client.request('/v2/users/' + user.id + '/managed_spaces/' + result.metadata.guid, 'PUT', null, {}, function(result)
										{
											if(typeof data == 'object')
												result = JSON.stringify(result);
												
											res.end(result);
										}, function(error){
											res.status(500).send({error : error});
										});
									});
								});
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
					}
					else
					{
						res.status(500).end('Not first user.');
					}
				});
			}, function(error){
				
			});
		},
		function(err)
		{
			res.status(500).send({error : err});
		});
	});
};