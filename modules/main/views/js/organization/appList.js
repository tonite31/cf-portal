(function()
{
	var APP_REFRESH_TIME = 5; //5초에 한 번씩 앱 목록을 갱신한다.
	var UPDATE_SCALE_SUCCESS_MESSAGE_TIME = 5; //앱의 인스턴스와 메모리 업데이트를 성공적으로 마친경우 메시지 표시 시간.
	var appRefreshTimer = null;
	
	var pumpkin = new Pumpkin();
	pumpkin.addWork('getAppList', function(params)
	{
		var that = this;
		CF.async({url : params.appsUrl}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					var progressTr = $('#appsBody tr:first');
					$('#appsBody tr').remove();
					$('#appsBody').append(progressTr);
					
					var appList = result.resources;
					if(appList.length == 0)
					{
						$('#appsBody').append('<tr><td colspan="6" style="text-align: center;">no applications</td></tr>');
					}
					else
					{
						for(var i=0; i<appList.length; i++)
						{
							var template = $('#appItemTemplate').html();
							
							if(appList[i].entity.state == 'STARTED')
								template = template.replace('{stateColor}', 'text-primary').replace('{stateIcon}', 'glyphicon-play').replace('{state}', 'Started');
							else if(appList[i].entity.state == 'STOPPED')
								template = template.replace('{stateColor}', 'text-muted').replace('{stateIcon}', 'glyphicon-pause').replace('{state}', 'Stopped');
							else
								template = template.replace('{stateColor}', 'text-danger').replace('{stateIcon}', 'glyphicon-stop').replace('{state}', 'Down');
							
							template = template.replace('{name}', appList[i].entity.name).replace(/{disk}/gi, appList[i].entity.disk_quota).replace(/{instance}/gi, appList[i].entity.instances).replace(/{memory}/gi, appList[i].entity.memory);
							
							var app = $(template).hide();
							appList[i].element = app;
							app.get(0).item = appList[i];
							
							$('#appsBody').append(app);
						}
					}
					
					that.next(appList);
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
		},
		function(error)
		{
			$('.apps-container').html('<p class="alert alert-danger">' + error + '</p>');
		});
	});

	pumpkin.addWork('getAppRoutes', function(params)
	{
		var that = this;
		var forEach = new ForEach();
		forEach.async(params.appList, function(app, index)
		{
			var appElement = app.element;
			var appDone = this.done;
			
			//비동기로 호출하기 때문에 먼저 도착한게 먼저 추가된다. 이것은 상관없음.
			CF.async({url : app.entity.routes_url, method : "GET"}, function(routeResult)
			{
				if(routeResult)
				{
					if(routeResult.resources)
					{
						var routesHtml = '';
						var routeList = routeResult.resources;
						
						forEach = new ForEach();
						forEach.async(routeList, function(route, index)
						{
							var routeDone = this.done;
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
								
								routeDone();
							},
							function(error)
							{
								routesHtml += '<p>' + host + ':' + error + '</p>';
								routeDone();
							});
						},
						function()
						{
							$(appElement).find('.app-routes').html(routesHtml ? routesHtml : 'no routes');
							appDone();
						});
					}
					else
					{
						//오류가 발생했다.
						console.error('체크용 : ', routeResult);
						$(appElement).find('.app-routes').html('<span style="color: red;">' + routeResult.description + '</span>');
					}
				}
				else
				{
					//라우트가 없다.
					$(appElement).find('.app-routes').html('<span style="color: red;">Routes is not found.</span>');
				}
			},
			function(error)
			{
				$(appElement).find('.app-routes').html('<span style="color: red;">' + error + '</span>');
			});
		},
		function()
		{
			//모든 앱의 라우트 바인딩이 끝났다.
			that.next();
		});
	});
	
	var bindScaleEvent = function()
	{
		$('#appsBody input[data-id]').on('keyup', function()
		{
			var prev = $(this).attr('data-value');
			if(prev != $(this).val())
			{
				$(this).parent().parent().parent().parent().find('td:last-child button').show().next().show();
			}
			else
			{
				var check = false;
				$(this).parent().parent().parent().parent().find('input[data-id]').each(function()
				{
					var prev = $(this).attr('data-value');
					if(prev != $(this).val())
						check = true;
				});
				
				if(!check)
				{
					$(this).parent().parent().parent().parent().find('td:last-child').find('*').hide();
				}
			}
		});
		
		$('#appsBody form').each(function()
		{
			var sacleTd = $(this).parent().next();
			var tr = $(this).parent().parent();
			var app = $(this).parent().parent().get(0);
			var item = app.item;
			
			formSubmit(this, function(data)
			{
				sacleTd.find('*').hide();
				sacleTd.find('.glyphicon-refresh').css('display', 'inline-block');
				CF.async({url : '/v2/apps/' + item.metadata.guid, method : 'PUT', form : {instances : new Number(data.instance), memory : new Number(data.memory)}}, function(result)
				{
					sacleTd.find('.glyphicon-refresh').hide();
					if(result)
					{
						if(result.entity)
						{
							item.entity.instances = new Number(data.instance);
							item.entity.memory = new Number(data.memory);
	
							app.item = item;
							
							sacleTd.find('*').hide();
							
							var desc = $($('#scaleResultTemplate').html().replace('{description}', 'Updated.'));
							desc.find('.scale-result-desc').css('color', '#337ab7').next().on('click', function()
							{
								desc.remove();
							});
							
							desc.insertAfter(tr);
							
							setTimeout(function()
							{
								$(desc).remove();
							}, 1000 * UPDATE_SCALE_SUCCESS_MESSAGE_TIME);
						}
						else
						{
							sacleTd.find('span[data-id="cancelScale"]').click();
							var desc = $($('#scaleResultTemplate').html().replace('{description}', result.description));
							desc.insertAfter(tr);
							desc.find('.glyphicon-remove').on('click', function()
							{
								desc.remove();
							});
						}
					}
				},
				function(error)
				{
					if(error.stack)
						console.error(error = error.stack);
					else
						console.error(error);
					
					var desc = $($('#scaleResultTemplate').html().replace('{description}', error));
					desc.insertAfter(tr);
					desc.find('.glyphicon-remove').on('click', function()
					{
						desc.remove();
					});
				});
			});
		});
		
		$('#appsBody button[data-id="updateScale"]').on('click', function()
		{
			$(this).parent().prev().find('input[type="submit"]').click();
		});
		
		$('#appsBody span[data-id="cancelScale"]').on('click', function()
		{
			$(this).parent().parent().find('input[data-id]').each(function()
			{
				var prev = $(this).attr('data-value');
				$(this).val(prev);
			});
			
			$(this).hide().prev().hide();
		});
	};
	
	var setAppList = function(appsUrl)
	{
		pumpkin.execute([{name : 'getAppList', params : {appsUrl : appsUrl}}], function(appList)
		{
			$('#appsBody tr').show();
			$('#appsProgress').parent().parent().hide();
			
			_ee.emit('setAppList_done', appList);
			
			if(appList.length > 0)
			{
				bindScaleEvent();
				setAppDetails();
				
				$('#appsProgress').parent().parent().next().click();
				
				pumpkin.execute([{name : 'getAppRoutes', params : {appList : appList}}], function()
				{
					$('#refreshAppList').removeAttr('data-state').css('animation-name', '');
				});
			}
		});
	}
	
	var setAppDetails = function()
	{
		$('#appsBody tr').off('click').on('click', function()
		{
			$('#appsBody tr').removeClass('selected');
			$(this).addClass('selected');
			
			var type = $('#appDetailTab li.active a').attr('aria-controls');
			var app = $(this).get(0).item;
			
			var detail = $('#appDetails');
			var context = detail.clone();
			
			context.insertAfter(detail);
			
			for(var key in _IntervalTimer.timers)
			{
				if(key.indexOf('app_detail_') != -1)
				{
					_IntervalTimer.end(key);
				}
			}
			
			$('head').find('*[data-type="details"]').remove();
			$('head').append('<script data-type="details" src="/modules/main/views/js/organization/app_' + type + '.js"></script>');
			$('head').append('<link data-type="details" href="/modules/main/views/css/organization/app_' + type + '.css" rel="stylesheet">');
			_ee.emit('app_detail_' + type, context, app);
			
			context.show();
			
			detail.remove();
			
			$('#appDetailTab a').on('click', function(e)
			{
				e.preventDefault();
				$(this).tab('show');
  
				var name = $(this).attr('aria-controls');
			  
				for(var key in _IntervalTimer.timers)
				{
					if(key.indexOf('app_detail_') != -1)
					{
						_IntervalTimer.end(key);
					}
				}
			  
				$('head').find('*[data-type="details"]').remove();
				$('head').append('<script data-type="details" src="/modules/main/views/js/organization/app_' + name + '.js"></script>');
				$('head').append('<link data-type="details" href="/modules/main/views/css/organization/app_' + name + '.css" rel="stylesheet">');
				  
				_ee.emit('app_detail_' + name, context, app);
			});
		});
	};

	_ee.on('hashchange', function()
	{
		if(_global.hash.space)
		{
			var space = $('#' + _global.hash.space).get(0);
			if(space)
			{
				_ee.emit('space_selected', space.item);
				
				$('#appsBody tr').hide();
				$('#appsProgress').parent().parent().show();
				
				$('#appsProgress .progress-message').text('Applications loading...');
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
			_ee.emit('space_selected', space.item);
			setAppList(space.item.entity.apps_url);
		}
		else
		{
			_global.hash.space = space.item.metadata.guid;
			_global.makeHash();
		}
	});
	
	$(document).ready(function()
	{
		$('#refreshAppList').on('click', function()
		{
			var state = $(this).attr('data-state');
			if(state != 'on')
			{
				var space = $('#' + _global.hash.space).get(0);
				setAppList(space.item.entity.apps_url);
				
				//refresh 수행
				$(this).css('animation-name', 'progress').attr('data-state', 'on')
			}
			else
			{
				$(this).prev().show();
			}
		});
	});
})();