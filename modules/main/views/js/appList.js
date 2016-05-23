(function()
{
	var pumpkin = new Pumpkin();
	pumpkin.addWork('getAppList', function(params)
	{
		$('#appsProgress .progress-message').text('Applications loading...');
		
		var that = this;
		CF.async({url : params.appsUrl}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					var appList = result.resources;
					if(appList.length == 0)
					{
						$('.org-container').html('<p class="alert alert-warning">Applications are not found.</p>');
						$('#appsBody tr').show();
						$('#appsProgress').parent().parent().hide();
					}
					else
					{
						for(var i=0; i<appList.length; i++)
						{
							var template = $('#appItemTemplate').html();
							
							if(appList[i].entity.state == 'STARTED')
								template = template.replace('{stateColor}', 'text-primary').replace('{stateIcon}', 'glyphicon-play').replace('{state}', 'Running');
							else if(appList[i].entity.state == 'STOPPED')
								template = template.replace('{stateColor}', 'text-muted').replace('{stateIcon}', 'glyphicon-pause').replace('{state}', 'Stopped');
							else
								template = template.replace('{stateColor}', 'text-danger').replace('{stateIcon}', 'glyphicon-stop').replace('{state}', 'Down');
							
							template = template.replace('{name}', appList[i].entity.name).replace(/{instance}/gi, appList[i].entity.instances).replace(/{memory}/gi, appList[i].entity.memory);
							
							var app = $(template).hide();
							appList[i].element = app;
							app.get(0).item = appList[i];
							
							$('#appsBody').append(app);
						}
						
						that.next(appList);
					}
				}
				else
				{
					$('.apps-container').html('<p class="alert alert-danger">' + result.description + '</p>');
				}
			}
			else
			{
				$('.apps-container').html('<p class="alert alert-warning">Applications are not found.</p>');
			}
		});
	});

	pumpkin.addWork('getAppRoutes', function(params)
	{
		console.log("알았어 시작한다 : ", params);
		var that = this;
		forEach(params.appList, function(app, index)
		{
			var appElement = app.element;
			var nextApp = this.next;
			CF.async({url : app.entity.routes_url, method : "GET"}, function(routeResult)
			{
				if(routeResult)
				{
					if(routeResult.resources)
					{
						var routesHtml = '';
						var routeList = routeResult.resources;
						forEach(routeList, function(route, index)
						{
							console.log(route);
							var nextRoute = this.next;
							var host = route.entity.host;
							var domainUrl = route.entity.domain_url;
							
							CF.async({url : domainUrl}, function(domain)
							{
								if(domain)
								{
									if(domain.entity)
									{
										var routeText = "http://" + host + "." + domain.entity.name;
										routesHtml += '<p><a target="_blank" href="' + routeText + '">' + routeText + '</a></p>';
									}
									else
									{
										$(appElement).find('.app-routes').html('<span style="color: red;">' + domain.description + '</span>');
									}
								}
								else
								{
									routesHtml += '<p>' + host + ': Domain is not found.</p>';
								}
								
								nextRoute();
							},
							function(error)
							{
								routesHtml += '<p>' + host + ':' + error + '</p>';
								nextRoute();
							});
						},
						function()
						{
							$(appElement).find('.app-routes').html(routesHtml ? routesHtml : 'no routes');
							nextApp();
						});
					}
					else
					{
						//오류가 발생했다.
						$(appElement).find('.app-routes').html('<span style="color: red;">' + routeResult.description + '</span>');
					}
				}
				else
				{
					//라우트가 없다.
					$(appElement).find('.app-routes').html('<span style="color: red;">Routes is not found.</span>');
				}
			});
		},
		function()
		{
			//done - 모든 앱의 라우트 바인딩이 끝난거야.
			that.next();
		});
	});
	
	var setAppDetails = function()
	{
		$('#appsBody tr').off('click').on('click', function()
		{
			$('#appsBody tr').removeClass('selected');
			$(this).addClass('selected');
			
			var app = $(this).get(0).item;
			setAbout(app);
			
			$('#appDetails').show();
		});
	};

	var setAbout = function(app)
	{
		$('#aboutProgress').show().next().hide();
		
		$('#aboutProgress .progress-message').text('Status loading...');
		
		$('#buildpack').text(app.entity.buildpack ? app.entity.buildpack : app.entity.detected_buildpack);
		$('#cmd').text(app.entity.detected_start_command);
		
		CF.async({url : app.entity.stack_url}, function(stackResult)
		{
			if(stackResult && stackResult.entity)
			{
				$('#stack').text(stackResult.entity.name + "(" + stackResult.entity.description + ")");
				$('#aboutProgress').next().show();
			}
			else
			{
				$('#aboutMessage').text(stackResult.description).show();
			}
			
			$('#aboutProgress').hide();
			
		}, function(error)
		{
			$('#aboutProgress').hide();
			$('#aboutMessage').text(error).show();
		});
	};
	
	var setAppList = function(appsUrl)
	{
		pumpkin.execute([{name : 'getAppList', params : {appsUrl : appsUrl}}], function(appList)
		{
			console.log("야 앱 끝났잖아", arguments);
			$('#appsBody tr').show();
			$('#appsProgress').parent().parent().hide();
			setAppDetails();
			
			pumpkin.execute([{name : 'getAppRoutes', params : {appList : appList}}]);
		});
	}
	
	_ee.on('hashchange', function()
	{
		if(_global.hash.space)
		{
			var space = $('#' + _global.hash.space).get(0);
			if(space)
			{
				setAppList(space.item.entity.apps_url);
			}
		}
	});

	_ee.on('orgList_done', function()
	{
		var space = null;
		if(_global.hash.space)
			space = $('#' + _global.hash.space).get(0);
		else
			space = $('#orgList li li').get(0);
		
		if(_global.hash.space == space.item.metadata.guid)
		{
			setAppList(space.item.entity.apps_url);
		}
		else
		{
			_global.hash.space = space.item.metadata.guid;
			_global.makeHash();
		}
	});
})();