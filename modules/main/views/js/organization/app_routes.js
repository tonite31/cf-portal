(function()
{
	var getUrlPumpkin = new Pumpkin();
	getUrlPumpkin.addWork('getRoute', function(params)
	{
		var next = this.next;
		CF.async({url : params.url}, function(result)
		{
			if(result)
			{
				if(result.entity)
				{
					next({host : result.entity.host, domain_url : result.entity.domain_url});
				}
				else
				{
					error(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				error('Route is not found.');
			}
		},
		function(error)
		{
			error(error);
		});
	});
	
	getUrlPumpkin.addWork('getDomain', function(params)
	{
		var next = this.next;
		CF.async({url : params.domain_url}, function(result)
		{
			if(result)
			{
				if(result.entity)
				{
					next('http://' + params.host + '.' + result.entity.name);
				}
				else
				{
					next(params.host + ' : ' + result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				next(params.host + ' : Domain is not found.');
			}
		},
		function(error)
		{
			next(params.host + ' : ' + error);
		});
	});
	
	var pumpkin = new Pumpkin();
	pumpkin.addWork('getRouteMappings', function()
	{
		var error = this.error;
		var next = this.next;
		
		var app = this.data.app;
		
		var that = this;
		
		//현재 앱에 맵핑된 라우트를 가져온다.
		CF.async({url : '/v2/route_mappings?q=app_guid:' + app.metadata.guid}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					var forEach = new ForEach();
					forEach.async(result.resources, function(routeMapping, index)
					{
						var done = this.done;
						getUrlPumpkin.execute([{name : 'getRoute', params : {url : routeMapping.entity.route_url}}, 'getDomain'], function(url)
						{
							routeMapping.entity.url = url;
							done();
						},
						function(workName, error)
						{
							that.data.urlList.push(error);
						});
					},
					function()
					{
						that.data.routeMappings = result.resources;
						next();
					});
				}
				else
				{
					error(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				next();
			}
		},
		function(error)
		{
			error(error);
		});
	});
	
	var addRouteMapping = function(context, appGuid, url, mappingUrl)
	{
		var template = $('#routesRowTemplate').html();
		
		var row = $(template.replace(/{url}/gi, url));
		
		confirmButton(row.find('.unmap'), function(done)
		{
			var that = this;
			CF.async({url : mappingUrl, method : 'DELETE'}, function(result)
			{
				$('#' + appGuid).find('.app-routes a[href="' + url + '"]').parent().remove();
				$(that).parent().parent().remove();
			},
			function(error)
			{
				$(that).next().text(error);
			});
		});
		
		$(context).find('.routes-table tbody').append(row);
	};
	
	var mapRoute = function(context, appGuid, routeGuid, data)
	{
		CF.async({url : "/v2/route_mappings", method : "POST", form : {app_guid : appGuid, route_guid : routeGuid}}, function(result)
		{
			if(result)
			{
				if(result.entity)
				{
					var url = 'http://' + data.host + '.' + data.domain;
					addRouteMapping(context, appGuid, url, result.metadata.url);
					
					$(context).find('.routes-form input[type="text"]').removeAttr('disabled').val('');
					$(context).find('.routes-form select').removeAttr('disabled').val('');
					$(context).find('.routes-form .map-progress').hide().next().show().next().show();
					
					//Append url to app list.
					$('#' + appGuid).find('.app-routes').append('<p><a target="_blank" href="' + url + '">' + url + '</a></p>');
					return;
				}
				else
				{
					$(context).find('.map-message').text(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				$(context).find('.map-message').text('Route mapping fail.');
			}
			
			$(context).find('.routes-form input[type="text"]').removeAttr('disabled');
			$(context).find('.routes-form select').removeAttr('disabled');
			$(context).find('.routes-form .map-progress').hide().next().show().next().show();
		},
		function(error)
		{
			$(context).find('.map-message').text(error);
			
			$(context).find('.routes-form input[type="text"]').removeAttr('disabled');
			$(context).find('.routes-form select').removeAttr('disabled');
			$(context).find('.routes-form .map-progress').hide().next().show().next().show();
		});
	};
	
	_ee.on('app_detail_routes', function(context, app)
	{
		$(context).find('.routesProgress').show().next().hide();
		
		pumpkin.setData({app : app});
		pumpkin.execute(['getRouteMappings'], function()
		{
			$(context).find('.routes-table tbody').html('');
			var mappingList = this.data.routeMappings;
			var forEach = new ForEach();
			forEach.async(mappingList, function(mapping, index)
			{
				var done = this.done;
				
				addRouteMapping(context, app.metadata.guid, mapping.entity.url, mapping.metadata.url);
				
				done();
			},
			function()
			{
				$(context).find('.routesProgress').hide().next().show().next().hide();
			});
		},
		function(workName, error)
		{
			$(context).find('.routesProgress').hide().next().hide();
			$(context).find('.routesMessage').text(error);
		});
		
		formSubmit($(context).find('.routes-form'), function(data)
		{
			$(context).find('.map-message').text('');
			
			var space = $('#' + _global.hash.space).get(0);
			data.space_guid = space.item.metadata.guid;
			data.domain = $(context).find('.routes-select option:selected').text();
			
			$(context).find('.routes-form input[type="text"]').attr('disabled', '');
			$(context).find('.routes-form select').attr('disabled', '');
			$(context).find('.routes-form .map-progress').css('display', 'inline-block').next().hide().next().hide();
			
			CF.async({url : '/v2/routes?q=host:' + data.host + '&q=domain_guid:' + data.domain_guid}, function(result)
			{
				if(result)
				{
					if(result.code)
					{
						$(context).find('.map-message').text(result.description ? result.description : JSON.stringify(result.error));
						return;
					}
					else if(result.total_results == 1)
					{
						mapRoute(context, app.metadata.guid, result.resources[0].metadata.guid, data);
						return;
					}
				}
				
				//만약 스페이스 라우트 목록에 라우트가 없다면 새로운 라우트를 먼저 만들고.
				CF.async({url : "/v2/routes", method : "POST", form : data}, function(result)
				{
					if(result)
					{
						if(result.entity)
						{
							//스페이스 라우트 목록에 있는 라우트를 이 앱에 맵핑 하는것. 이 라우트는 다른 앱에도 맵핑될 수 있나봄?
							mapRoute(context, app.metadata.guid, result.metadata.guid, data);
							return;
						}
						else
						{
							$(context).find('.map-message').text(result.description ? result.description : JSON.stringify(result.error));
						}
					}
					else
					{
						$(context).find('.map-message').text('Route adding fail.');
					}
					
					$(context).find('.routes-form input[type="text"]').removeAttr('disabled');
					$(context).find('.routes-form select').removeAttr('disabled');
					$(context).find('.routes-form .map-progress').hide().next().show().next().show();
				},
				function(error)
				{
					$(context).find('.map-message').text(error);
					
					$(context).find('.routes-form input[type="text"]').removeAttr('disabled');
					$(context).find('.routes-form select').removeAttr('disabled');
					$(context).find('.routes-form .map-progress').hide().next().show().next().show();
				});
			});
		});
		
		var space = $('#' + _global.hash.space).get(0);
		var select = $(context).find('.routes-select');
		CF.async({url : space.item.organization.entity.domains_url}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					var domainList = result.resources;
					for(var i=0; i<domainList.length; i++)
					{
						select.append('<option value="' + domainList[i].metadata.guid + '">' + domainList[i].entity.name + '</option>');
					}
					
					select.removeAttr('disabled').children('option:first').text('Select a domain');
				}
				else
				{
					$(context).find('.map-message').text(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				$(context).find('.map-message').text('Domains are not found.');
			}
		},
		function(error)
		{
			$(context).find('.map-message').text(error);
		});
		
		$(context).find('.map-cancel').on('click', function()
		{
			$(context).find('.routes-form input[type="text"]').val('');
			$(context).find('.routes-form select').val('');
		});
	});
})();