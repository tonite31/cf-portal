var Pumpkin = require('nodejs-pumpkin');
var CFClient = require('../../lib/CFClient');
var nodemailer = require('nodemailer');

module.exports = function(app)
{
	var pumpkin = new Pumpkin();
	
	pumpkin.addWork('createUser', function()
	{
		this.data.client.createUser(this.data.username, this.data.password, function(user)
		{
			if(typeof user == 'string')
				user = JSON.parse(user);
			
			if(user.userName == this.data.username)
			{
				this.data.user = user;
				console.log("유저 생성 넥스트");
				this.next();
			}
			else
			{
				this.data.res.status(500).end('User creation is failed.');
			}
		}.bind(this));
	});
	
	pumpkin.addWork('getQuotaDefinition', function()
	{
		this.data.client.request('/v2/quota_definitions', 'GET', null, null, function(data)
		{
			if(typeof data == 'string')
				data = JSON.parse(data);
			
			var quota_guid = null;
			var quotaList = data.resources;
			for(var i=0; i<quotaList.length; i++)
			{
				if(quotaList[i].entity.name == 'personal')
				{
					quota_guid = quotaList[i].metadata.guid;
					break;
				}
			}
			
			console.log("쿼타 생성 넥스트");
			if(quota_guid)
				this.next(quota_guid);
			else
				this.data.res.status(500).end('Usable quota definition is not found.');
		}.bind(this));
	});
	
	pumpkin.addWork('createOrganization', function(quota_guid)
	{
		this.data.client.request('/v2/organizations', 'POST', null, {name : this.data.user.userName + "_Org", quota_definition_guid : quota_guid}, function(data)
		{
			try
			{
				if(typeof data == 'string')
					data = JSON.parse(data);
				
				var orgId = data.metadata.guid;
				this.data.client.request('/v2/organizations/' + orgId + '/managers', 'PUT', null, {username : this.data.user.userName}, function(result)
				{
					if(typeof result == 'string')
						result = JSON.parse(result);
					
					if(result && result.entity)
					{
						console.log("조직 생성 넥스트");
						this.next();
					}
					else
					{
						//실패할경우 롤백..?
						this.data.client.request('/v2/organizations/' + orgId, 'DELETE', null, {}, function(result)
						{
							this.data.client.deleteUser(this.data.user.id, function()
							{
								this.data.res.status(500).send({error : result, message : 'Assosiate user to organization is failed.'});
							},
							function(error)
							{
								this.data.res.status(500).send({error : error, message : 'Assosiate user to organization is failed.'});
							});
						}.bind(this));
					}
				}.bind(this));
			}
			catch(err)
			{
				this.data.client.request('/v2/organizations/' + orgId, 'DELETE', null, {}, function(result)
				{
					console.log(err);
					this.data.res.status(500).send({error : err});
				});
			}
		}.bind(this),
		function(error)
		{
			this.data.res.status(500).send({error : error});
		}.bind(this));
	});
	
	pumpkin.addWork('assosiateAuditor', function()
	{
		this.data.client.request('/v2/organizations/' + this.data.orgGuid + '/auditors', 'PUT', {}, {username : this.data.user.userName}, function(data)
		{
			if(typeof data == 'string')
				data = JSON.parse(data);
			
			if(data && data.entity)
			{
				console.log("어소시 생성 넥스트");
				this.next(data);
			}
			else
			{
				//auditor 실패
				this.data.res.status(500).send({error : data});
			}
		}.bind(this),
		function(error)
		{
			 this.data.res.status(500).send({error : error});
		}.bind(this));
	});
	
	pumpkin.addWork('sendMail', function(data)
	{
		console.log("센드메일까지 왔음");
		//create reusable transporter object using the default SMTP transport
		var transporter = nodemailer.createTransport('smtps://' + _config.smtps.username + ':' + _config.smtps.password + '@' + _config.smtps.host);
		
		var hostname = 'http://' + this.data.req.headers.host;
		
		var mailOptions = {
			from: '"Administrator@ghama.io"', // sender address
			to: this.data.username, // list of receivers
			subject: 'Invite to ghama', // Subject line
			html: '<p>Invite you to ghama. Your first password is "1111". </p><p><a target="_blank" href="' + hostname + '/signin">Sign in to ghama.</a></p><p>To decline this invitation ignore this message.</p>' // html body
		};
		
		transporter.sendMail(mailOptions, function(error, info)
		{
		    if(error){
		    	this.next(data);
		    }
		    else
		    {
		    	this.next(data);
		    }
		}.bind(this));
	});
	
	app.post('/mail', function(req, res, next)
	{
		var cf = new CFClient(req.session.cfdata);
		if(!cf.isLogin())
		{
			res.statusCode = 302;
			res.end('signin');
			return;
		}
		
		var target = req.body.target;
		var orgGuid = req.body.orgGuid;
		
		var targetList = target.split(',');
		
		var resultMappingList = [];
		
		console.log("자 타겟이다 : ", targetList);
		var client = new CFClient();
		client.setUserInfo(_config.admin.username, _config.admin.password);
		client.login(function()
		{
			var forEach = require('async-foreach').forEach;
			forEach(targetList, function(email, index)
			{
				var done = this.async();
				
				var password = '1111';
				email = email.trim();
				pumpkin.setData({username : email, password : password, orgGuid : orgGuid, req : req, res : res, client : client});
				
				console.log("호잇?");
				client.getUser(email, function(result)
				{
					if(result && result.totalResults == 0)
					{
						//유저가 없으면 생성부터 시작해야 한다.
						pumpkin.execute(['createUser', 'getQuotaDefinition', 'createOrganization', 'assosiateAuditor', 'sendMail'], function(result)
						{
							result.entity.username = this.data.username;
							result.entity.id = this.data.user.id;
							
							console.log("마지막 결과 : ", result);
							resultMappingList.push(result);
							done();
						});
//						async.waterfall([function(callback){createUser(email, password, callback);}, getQuotaDefinition, createOrganization, assosiateAuditor, sendMail, function(result)
//						{
//							console.log("마지막 결과 : ", result);
//							resultMappingList.push(result);
//							done();
//						}]);
					}
					else
					{
						//invite를 할건데 유저가 이미 있으면 생성할 필요 없이 조직에 auditor로만 추가하면 된다.
						console.log("이미 있네?");
						result = result.resources[0];
						
						console.log("리절트 : ", result);
						var url = '/v2/organizations/' + orgGuid + '/auditors';
						var method = 'put';
						
						cf.request(url, method, {}, {username : email}, function(data)
						{
							if(typeof data == 'string')
								data = JSON.parse(data);
							
							if(data && data.entity)
							{
								data.entity.username = email;
								data.entity.id = result.id;
								
								resultMappingList.push(data);
								
								done();
							}
						},
						function(error)
						{
							 res.status(500).send({error : error});
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
};