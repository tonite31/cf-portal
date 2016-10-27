var request = require('request');
var WebSocket = require('ws');

var CFClient = function(data)
{
	if(!data)
		data = {};
	
	if(!data.endpoint)
		this.endpoint = {api : _config.endpoint};
	else
		this.endpoint = data.endpoint;
	
	this.endpoint.api = this.endpoint.api.trim();
	if(this.endpoint.api.lastIndexOf('/') == this.endpoint.api.length-1)
		this.endpoint.api = this.endpoint.api.substring(0, this.endpoint.api.length-1);
	
	this.uaaToken = data.uaaToken;
	this.username = data.username;
	this.oldPassword = data.oldPassword;
	this.password = data.password;
};

CFClient.prototype.getData = function()
{
	return {endpoint : this.endpoint, uaaToken : this.uaaToken, username : this.username, oldPassword : this.oldPassword, password : this.password};
};

CFClient.prototype.setUaaToken = function(token)
{
	this.uaaToken = token;
};

CFClient.prototype.isLogin = function()
{
	return this.uaaToken ? true : false;
};

CFClient.prototype.logout = function()
{
	this.username = null;
	this.oldPassword = null;
	this.password = null;
	this.uaaToken = null;
};

CFClient.prototype.setUserInfo = function(username, password)
{
	this.username = username;
	this.password = password;
};

CFClient.prototype.login = function(done, error)
{
	try
	{
		var param = {};
		param.url = this.endpoint.api + '/v2/info';
		param.method = 'get';

		request(param, function(err, response, body)
		{
			if(err)
			{
				if(error)
					error(err);
			}
			else
			{
				if(response.statusCode == 200)
				{
					var info = JSON.parse(body);
					this.endpoint.authorization = info.authorization_endpoint;
					this.endpoint.logging = info.logging_endpoint;
					this.endpoint.routing = info.routing_endpoint;
					
					param = {};
					param.url = this.endpoint.authorization + '/oauth/token';
					param.headers = {
						Authorization: 'Basic Y2Y6',
		            	'Content-Type': 'application/x-www-form-urlencoded'
					};
					param.method = 'POST';
					param.form = {
		                grant_type: 'password',
		                client_id: 'cf',
		                username: this.username,
		                password: this.password
		            };
					
					request(param, function(err, response, body)
					{
						if(err)
						{
							if(error)
								error(err);
						}
						else if(response.statusCode != 200)
						{
							error(body);
						}
						else
						{
							var data = JSON.parse(body);
							if(data.error)
							{
								error(data);
							}
							else
							{
								this.uaaToken = data;
								
								if(_redis != null)
									_redis.set('cfdata', JSON.stringify(data));
								done();
							}
						}
					}.bind(this));
				}
				else
				{
					var start = body.indexOf('<h1>');
					var end = body.indexOf('</h1>');
					
					var errorMessage = body.substring(start, end);
					if(errorMessage)
						error(errorMessage.replace('<h1>', ''));
					else
						error(body);
				}
			}
		}.bind(this));
	}
	catch(err)
	{
		if(error)
			error(err);
	}
};

CFClient.prototype.getUsers = function(done, error)
{
	var param = {};
	param.url = this.endpoint.authorization + '/Users';
	param.method = 'get';
	param.headers = {};
	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
	
	request(param, function(err, response, body)
	{
		if(err)
		{
			console.log(err);
			if(error)
				error(err);
		}
		else
		{
			if(body)
			{
				body = JSON.parse(body);
				var resources = body.resources;
				for(var i=0; i<resources.length; i++)
				{
					console.log(resources[i].userName, resources[i].id);
				}
			}
		}
	}.bind(this));
};

CFClient.prototype.getUser = function(email, done, error)
{
	var param = {};
	param.url = this.endpoint.authorization + "/Users?filter=userName eq '" + email + "'";
	param.method = 'get';
	param.headers = {};
	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
	
	request(param, function(err, response, body)
	{
		if(err)
		{
			console.log(err);
			if(error)
				error(err);
		}
		else
		{
			if(body)
			{
				if(typeof body == 'object')
					done(body);
				else if(typeof body == 'string')
					done(JSON.parse(body));	
			}
		}
	}.bind(this));
};

CFClient.prototype.deleteUser = function(id, done, error)
{
	var param = {};
	param.url = this.endpoint.authorization + '/Users/' + id;
	param.method = 'DELETE';
	param.headers = {};
	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
	
	request(param, function(err, response, body)
	{
		if(err)
		{
			console.log(err);
			if(error)
				error(err);
		}
		else
		{
			done(body);	
		}
	}.bind(this));
};

CFClient.prototype.changePassword = function(id, password, done, error)
{
	var param = {};
	param.url = this.endpoint.authorization + '/Users/' + id + '/password';
	param.method = 'put';
	param.headers = {};
	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
	param.json = {
		    'oldPassword': this.password,
		    'password' : password,
		    'schemas':['urn:scim:schemas:core:1.0']};
	
	request(param, function(err, response, body)
	{
		if(err)
		{
			console.log(err);
			if(error)
				error(err);
		}
		else
		{
			if(body)
			{
				done(body);
			}
		}
	}.bind(this));
};

CFClient.prototype.createUser = function(email, password, done, error)
{
	var param = {};
	param.url = this.endpoint.authorization + '/Users';
	param.method = 'post';
	param.headers = {};
	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
	param.json = {
		    'externalId':'',
		    'userName':email,
		    'emails':[],
		    'active':true,
		    'verified':false,
		    'origin':'uaa',
		    'password':password,
		    'schemas':['urn:scim:schemas:core:1.0']};
	
	param.json.emails.push({value : email});
	
	request(param, function(err, response, body)
	{
		if(err)
		{
			console.log(err);
			if(error)
				error(err);
		}
		else
		{
			if(body)
			{
				done(body);
			}
		}
	}.bind(this));
};

CFClient.prototype.updateUser = function(data, done, error)
{
	var param = {};
	param.url = this.endpoint.authorization + '/Users/' + data.id;
	param.method = 'PUT';
	param.headers = {'IF-Match' : '*'};
	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
	param.json = {
		    'externalId':'',
		    'userName':'tonite31@sk.com',
		    name : data.name,
		    'emails':[{'value':'tonite31@sk.com'}],
		    'active':true,
		    'verified':false,
		    'origin':'uaa',
		    'schemas':['urn:scim:schemas:core:1.0']};
	
	request(param, function(err, response, body)
	{
		if(err)
		{
			console.log(err);
			if(error)
				error(err);
		}
		else
		{
			if(body)
			{
				done(body);
			}
		}
	}.bind(this));
};

CFClient.prototype.inviteUser = function(done, error)
{
//	var param = {};
//	param.url = this.endpoint.authorization + '/invite_users?client_id=cf&redirect_uri=http://localhost:3000';
//	param.method = 'post';
//	param.headers = {};
//	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
//	param.json = {emails : [{value : 'tonite32@gmail.com'}]};
//	
//	request(param, function(err, response, body)
//	{
//		if(err)
//		{
//			console.log(err);
//			if(error)
//				error(err);
//		}
//		else
//		{
//			if(body)
//			{
//				console.log('바디 : ', body);
//			}
//		}
//	}.bind(this));
	
	var param = {};
	param.url = this.endpoint.authorization + '/Groups';
	param.method = 'post';
	param.headers = {};
	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
	param.json = {'displayName' : 'scim.invite'};
	
	request(param, function(err, response, body)
	{
		if(err)
		{
			console.log(err);
			if(error)
				error(err);
		}
		else
		{
			if(body)
			{
				console.log('바디 : ', body);
			}
		}
	}.bind(this));
};

CFClient.prototype.request = function(url, method, headers, data, done, error)
{
	if(!url)
	{
		error('URL is undefined.');
		return;
	}
	
	var param = {};
	if(url.indexOf('/recent') == 0)
		param.url = this.endpoint.logging.replace('wss', 'https').replace(':443', '').replace(':4443', '') + url;
	else
		param.url = this.endpoint.api + url;
	
	param.method = method ? method : 'GET';
	param.headers = {};
	
	for(var key in headers)
		param.headers[key] = headers[key];
	
	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
	if(param.headers['Content-Type'] && param.headers['Content-Type'].indexOf('application/json') != -1)
		param.json = data;
	else if(data)
		param.form = JSON.stringify(data);
	
	request(param, function(err, response, body)
	{
		if(err)
		{
			if(error)
				error(err);
		}
		else if(response.statusCode == 404 || response.statusCode == 500)
		{
			error(response.statusCode, body);
		}
		else if(response.statusCode == 401)
		{
			if(body)
			{
				if(body.indexOf && (body.indexOf('CF-InvalidAuthToken') != -1 || body.indexOf('Invalid authorization') != -1))
				{
					//login이 풀린것.
					this.login(function()
					{
						param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
						request(param, function(err, response, body)
						{
							if(err)
							{
								if(error)
									error(response.statusCode, err);
							}
							else if(response.statusCode == 404)
							{
								error(response.statusCode, body);
							}
							else
							{
								if(url.indexOf('/recent') != -1)
								{
									done(body);
								}
								else
								{
									done(body ? JSON.parse(body) : '');
								}
							}
						});
					}.bind(this), error);
					
					return;
				}
			}
			
			error(response.statusCode, body);
		}
		else
		{
			if(url.indexOf('/recent') != -1)
			{
				done(body);
			}
			else
			{
				if(typeof body == 'string')
					done(body ? JSON.parse(body) : '');
				else
					done(body);
			}
		}
	}.bind(this));
};

CFClient.prototype.getTailLog = function(url, done, error)
{
	try
	{
		if(!url)
		{
			error('URL is undefined.');
			return;
		}
		
		var socket = new WebSocket(this.endpoint.logging + url,
		{
	        headers: {
	            'Authorization': this.uaaToken.token_type + ' ' + this.uaaToken.access_token
	        }
	    });
		
		done(socket);
	}
	catch(err)
	{
		console.log(err);
		error(err);
	}
};

module.exports = CFClient;