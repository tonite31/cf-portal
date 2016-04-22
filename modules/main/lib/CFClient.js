var request = require('request');

var CFClient = function()
{
	this.endpoint = {api : _config.endpoint};
	this.uaaToken = null;
	this.username = null;
	this.password = null;
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
	this.username = '';
	this.password = '';
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
				var info = JSON.parse(body);
				this.endpoint.authorization = info.authorization_endpoint;
				this.endpoint.logging_socket = info.logging_endpoint;
				this.endpoint.logging = 'https://' + info.logging_endpoint.replace('wss://', '').replace(':443', '');
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
							done();
						}
					}
				}.bind(this));
			}
		}.bind(this));
	}
	catch(err)
	{
		if(error)
			error(err);
	}
};

CFClient.prototype.users = function(url, method, headers, data, done, error)
{
	var param = {};
	param.method = method ? method : 'GET';
	param.url = this.endpoint.authorization + url;
	param.headers = {};
	
	if(headers)
	{
		for(var key in headers)
			param.headers[key] = headers[key];
	}
	
	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
	if(data)
		param.json = data;
	
	request(param, function(err, response, body)
	{
		if(err)
		{
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
//	var param = {};
//	param.url = this.endpoint.api + '/v2/users/' + id + '/audited_organizations/' + orgId;
//	param.method = 'DELETE';
//	param.headers = {};
//	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
//	
//	request(param, function()
//	{
//		param.url = this.endpoint.api + '/v2/users/' + id + '/billing_managed_organizations/' + orgId;
//		request(param, function()
//		{
//			param.url = this.endpoint.api + '/v2/users/' + id + '/managed_organizations/' + orgId;
//			request(param, function()
//			{
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
//			}.bind(this));
//		}.bind(this));
//	}.bind(this));
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
	var param = {};
	param.url = this.endpoint.authorization + '/invite_users';
	param.method = 'post';
	param.headers = {};
	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
	param.json = {emails : [{value : 'tonite31@sk.com'}]};
	
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
	var param = {};
	if(url.indexOf('/recent') == 0)
		param.url = this.endpoint.logging + url;
	else
		param.url = this.endpoint.api + url;
	
	param.method = method ? method : 'GET';
	param.headers = {};
	
	for(var key in headers)
		param.headers[key] = headers[key];
	
	param.headers.Authorization = this.uaaToken.token_type + ' ' + this.uaaToken.access_token;
	if(data)
		param.form = JSON.stringify(data);
	
	request(param, function(err, response, body)
	{
		if(err)
		{
			if(error)
				error(err);
		}
		else
		{
			if(body)
			{
				if(body.indexOf && body.indexOf('CF-InvalidAuthToken') != -1)
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
									error(err);
							}
							else
							{
								done(JSON.parse(body));
							}
						});
					}.bind(this), error);
					
					return;
				}
			}
			
			done(body);
		}
	}.bind(this));
};

CFClient.prototype.organizations = function()
{
	var param = {};
	param.url = this.endpoint.api + '/v2/organizations';
	param.method = 'get';
	param.headers = {
        Authorization: this.uaaToken.token_type + ' ' + this.uaaToken.access_token
    }
	request(param, function(error, response, body)
	{
		if(error)
		{
			console.log(error);
		}
		else
		{
			console.log('organizations : ', body);
		}
	}.bind(this));
};

module.exports = CFClient;