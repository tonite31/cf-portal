(function()
{
	var getUrlPumpkin = new Pumpkin();
	getUrlPumpkin.addWork('getRoute', function(params)
	{
		var next = this.next;
		var error = this.error;
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
		function(err)
		{
			error(err);
		});
	});
	
	getUrlPumpkin.addWork('getDomain', function(params)
	{
		var next = this.next;
		var error = this.error;
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
		function(err)
		{
			next(params.host + ' : ' + err);
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
		CF.async({url : '/v2/apps/' + app.metadata.guid + '/routes'}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					var forEach = new ForEach();
					forEach.async(result.resources, function(routeMapping, index)
					{
						var done = this.done;
						getUrlPumpkin.execute([{name : 'getDomain', params : {host : routeMapping.entity.host, domain_url : routeMapping.entity.domain_url}}], function(url)
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
		function(err)
		{
			error(err);
		});
	});
	
	var addRouteMapping = function(context, appGuid, url, mappingUrl)
	{
		var template = $('#routesRowTemplate').html();
		
		var row = $(template.replace(/{url}/gi, url));
		
		confirmButton(row.find('.unmap'), function(done)
		{
			var that = this;
			CF.async({url : mappingUrl + '/apps/' + appGuid, method : 'DELETE'}, function(result)
			{
				var p = $('tr[data-guid="' + appGuid + '"] .app-routes a[href="' + url + '"]').parent();
				var td = p.parent();
				p.remove();
				
				$(that).parent().parent().remove();
				
				if(td.get(0) && td.get(0).children.length == 0)
					td.html('no routes');
			},
			function(error)
			{
				$(that).next().text(error);
			});
		});
		
		if($(context).find('#routes .routes-table tbody a[href="' + url + '"]').length == 0)
			$(context).find('#routes .routes-table tbody').append(row);
	};
	
	var mapRoute = function(context, appGuid, routeGuid, data)
	{
		CF.async({url : '/v2/routes/' + routeGuid + '/apps/' + appGuid, method : "PUT"}, function(result)
		{
			if(result)
			{
				if(result.entity)
				{
					var url = 'http://' + data.host + '.' + data.domain;
					addRouteMapping(context, appGuid, url, result.metadata.url);
					
					$(context).find('#routes .routes-form input[type="text"]').removeAttr('disabled').val('');
					$(context).find('#routes .routes-form select').removeAttr('disabled').val('');
					$(context).find('#routes .routes-form .map-progress').hide().next().show().next().show();
					
					//Append url to app list.
					var td = $('tr[data-guid="' + appGuid + '"] .app-routes');
					if(td.html() == 'no routes')
						td.html('');
					
					if(td.find('a[href="' + url + '"]').length == 0)
						td.append('<p><a target="_blank" href="' + url + '">' + url + '</a></p>');
					return;
				}
				else
				{
					$(context).find('#routes .map-message').text(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				$(context).find('#routes .map-message').text('Route mapping fail.');
			}
			
			$(context).find('#routes .routes-form input[type="text"]').removeAttr('disabled');
			$(context).find('#routes .routes-form select').removeAttr('disabled');
			$(context).find('#routes .routes-form .map-progress').hide().next().show().next().show();
		},
		function(error)
		{
			$(context).find('#routes .map-message').text(error);
			
			$(context).find('#routes .routes-form input[type="text"]').removeAttr('disabled');
			$(context).find('#routes .routes-form select').removeAttr('disabled');
			$(context).find('#routes .routes-form .map-progress').hide().next().show().next().show();
		});
	};
	
	_ee.once('app_detail_routes', function(context, app)
	{
		$(context).find('#routes .routesProgress').show().next().hide();
		$(context).find('#routes .routesMessage').text('').hide();
		$(context).find('#routes input[name="host"]').val('');
		
		pumpkin.setData({app : app, urlList : []});
		pumpkin.execute(['getRouteMappings'], function()
		{
			$(context).find('#routes .routes-table tbody').html('');
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
				$(context).find('#routes .routesProgress').hide().next().show().next().hide();
			});
		},
		function(workName, error)
		{
			$(context).find('#routes .routesProgress').hide().next().hide();
			$(context).find('#routes .routesMessage').text(error).show();
		});
		
		formSubmit($(context).find('#routes .routes-form'), function(data)
		{
			$(context).find('#routes .map-message').text('');
			
			var space = $('#' + _global.hash.space).get(0);
			data.space_guid = space.item.metadata.guid;
			data.domain = $(context).find('#routes .routes-select option:selected').text();
			
			$(context).find('#routes .routes-form input[type="text"]').attr('disabled', '');
			$(context).find('#routes .routes-form select').attr('disabled', '');
			$(context).find('#routes .routes-form .map-progress').css('display', 'inline-block').next().hide().next().hide();
			
			CF.async({url : '/v2/routes?q=host:' + data.host + '&q=domain_guid:' + data.domain_guid}, function(result)
			{
				if(result)
				{
					if(result.resources)
					{
						if(result.resources.length == 1)
						{
							mapRoute(context, app.metadata.guid, result.resources[0].metadata.guid, data);
							
							$(context).find('#routes .routes-form input[type="text"]').removeAttr('disabled');
							$(context).find('#routes .routes-form select').removeAttr('disabled');
							$(context).find('#routes .routes-form .map-progress').hide().next().show().next().show();
							
							return;
						}
					}
					else
					{
						$(context).find('#routes .routes-form input[type="text"]').removeAttr('disabled');
						$(context).find('#routes .routes-form select').removeAttr('disabled');
						$(context).find('#routes .routes-form .map-progress').hide().next().show().next().show();
						$(context).find('#routes .map-message').text(result.description ? result.description : JSON.stringify(result.error));
						return;
					}
				}
				else
				{
					$(context).find('#routes .routes-form input[type="text"]').removeAttr('disabled');
					$(context).find('#routes .routes-form select').removeAttr('disabled');
					$(context).find('#routes .routes-form .map-progress').hide().next().show().next().show();
					$(context).find('#routes .map-message').text('Unknown Error');
					return;
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
							$(context).find('#routes .map-message').text(result.description ? result.description : JSON.stringify(result.error));
						}
					}
					else
					{
						$(context).find('#routes .map-message').text('Route adding fail.');
					}
					
					$(context).find('#routes .routes-form input[type="text"]').removeAttr('disabled');
					$(context).find('#routes .routes-form select').removeAttr('disabled');
					$(context).find('#routes .routes-form .map-progress').hide().next().show().next().show();
				},
				function(error)
				{
					$(context).find('#routes .map-message').text(error);
					
					$(context).find('#routes .routes-form input[type="text"]').removeAttr('disabled');
					$(context).find('#routes .routes-form select').removeAttr('disabled');
					$(context).find('#routes .routes-form .map-progress').hide().next().show().next().show();
				});
			},
			function(error)
			{
				$(context).find('#routes .map-message').text(error);
			});
		});
		
		var space = $('#' + _global.hash.space).get(0);
		var select = $(context).find('#routes .routes-select').html('');
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
					
					select.removeAttr('disabled').prepend('<option value="">Select a domain</option>');
				}
				else
				{
					$(context).find('#routes .map-message').text(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				$(context).find('#routes .map-message').text('Domains are not found.');
			}
		},
		function(error)
		{
			$(context).find('#routes .map-message').text(error);
		});
		
		$(context).find('#routes .map-cancel').on('click', function()
		{
			$(context).find('#routes .routes-form input[type="text"]').val('');
			$(context).find('#routes .routes-form select').val('');
		});
	});
})();