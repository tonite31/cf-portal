(function()
{
	var APP_REFRESH_TIME = 60 * 1; //1분에 한 번씩 앱 목록을 갱신한다.
	var UPDATE_SCALE_SUCCESS_MESSAGE_TIME = 3; //앱의 인스턴스와 메모리 업데이트를 성공적으로 마친경우 메시지 표시 시간.
	var appRefreshTimer = null;
	
	var selectedAppGuid = null;
	
	var checkState = function(app)
	{
		var appGuid = app.metadata.guid;
		var td = $('#appsBody tr[data-guid="' + appGuid + '"] td:first');
		CF.async({url : '/v2/apps/' + appGuid + '/stats'}, function(result)
		{
			if(result)
			{
				if(result.description || result.error)
				{
					if(result.code == 200003)
					{
						td.html('<span class="text-muted glyphicon glyphicon-pause"></span> <span>Stopped</span>');
					}
					else
					{
						td.html('<span style="color: red; font-size: 10px;">' + result.description ? result.description : JSON.stringify(result.error) + '</span>');
						
						setTimeout(function()
						{
							td.html('<span class="glyphicon glyphicon-refresh small-progress" style="display: inline-block;"></span>');
							checkState(app);
						}, 3000);
					}
				}
				else
				{
					var isRunning = true;
					var runningCount = 0;
					var startingCount = 0;
					var totalCount = 0;
					for(var key in result)
					{
						if(result[key].state == 'RUNNING')
						{
							runningCount++;
						}
						else if(result[key].state == 'STARTING')
						{
							startingCount++;
						}
						
						totalCount++;
					}
					
					if(runningCount > 0)
					{
						if(startingCount == 0)
						{
							//running만 있으니까 완전 시작.
							td.html('<span class="text-primary glyphicon glyphicon-play"></span> <span>Started</span>');
						}
						else
						{
							//running도 있고 starting이 있고.
							td.html('<span class="text-primary glyphicon glyphicon-play"></span> <span>Started (' + runningCount + '/' + totalCount + ')</span>');
						}
					}
					else
					{
						if(startingCount == 0)
						{
							//running 없고 starting도 없고 down.
							if(app.entity.state == 'STARTED')
							{
								var split = $('#startedAppCount').text().split(' ');
								if(split && split.length == 2)
								{
									var count = new Number(split[0]);
									$('#startedAppCount').text((--count) + ' Started');
								}
							}
							else if(app.entity.state == 'STOPPED')
							{
								var split = $('#stoppedAppCount').text().split(' ');
								if(split && split.length == 2)
								{
									var count = new Number(split[0]);
									$('#stoppedAppCount').text((--count) + ' Stopped');
								}
							}
							
							var split = $('#downAppCount').text().split(' ');
							if(split && split.length == 2)
							{
								var count = new Number(split[0]);
								$('#downAppCount').text((++count) + ' Down');
							}
							else
							{
								$('#downAppCount').text('1 Down');
							}
							
							app.entity.state = 'DOWN';
							td.html('<span class="text-danger glyphicon glyphicon-stop"></span> <span>Down</span>');
						}
						else
						{
							//running 없고 starting 있고.
							td.append('<span>Starting (' + runningCount + '/' + totalCount + ')</span>');
						}
					}
					
					if(app.entity.state == 'STARTED')
					{
						$('#startApp').hide();
						$('#stopApp').show();
						$('#restartApp').show();
					}
					else
					{
						$('#startApp').show();
						$('#stopApp').hide();
						$('#restartApp').hide();
					}
				}
			}
			else
			{
				template = template.replace(progressTemplate, '<span class="text-muted glyphicon glyphicon-pause"></span> <span>Stopped</span>');
			}
			
			td.find('span').on('click', function()
			{
				
			});
		});
	};
	
	var pumpkin = new Pumpkin();
	pumpkin.addWork('getAppList', function(params)
	{
		$('#deleteApp').show();
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
					$('#appsBody').get(0).item = appList;
					if(appList.length == 0)
					{
						$('#startApp').hide();
						$('#stopApp').hide();
						$('#restartApp').hide();
						$('#deleteApp').hide();
						$('#appsBody').append('<tr><td colspan="7" style="text-align: center;">no applications</td></tr>');
					}
					else
					{
						var progressTemplate = '<span class="glyphicon glyphicon-refresh small-progress" style="display: inline-block;"></span>';
						for(var i=0; i<appList.length; i++)
						{
							var template = $('#appItemTemplate').html();
							
//							if(appList[i].entity.state == 'STARTED')
//								template = template.replace('{stateColor}', 'text-primary').replace('{stateIcon}', 'glyphicon-play').replace('{state}', 'Started');
//							else if(appList[i].entity.state == 'STOPPED')
//								template = template.replace('{stateColor}', 'text-muted').replace('{stateIcon}', 'glyphicon-pause').replace('{state}', 'Stopped');
//							else
//								template = template.replace('{stateColor}', 'text-danger').replace('{stateIcon}', 'glyphicon-stop').replace('{state}', 'Down');
							
							template = template.replace('{guid}', appList[i].metadata.guid).replace('{name}', appList[i].entity.name).replace(/{disk}/gi, appList[i].entity.disk_quota).replace(/{instance}/gi, appList[i].entity.instances).replace(/{memory}/gi, appList[i].entity.memory);
							
							var app = $(template).hide();
							appList[i].element = app;
							app.get(0).item = appList[i];
							
							$('#appsBody').append(app);
							
							checkState(appList[i]);
						}
					}
					
					that.next(appList);
				}
				else
				{
					$('.apps-container').html('<p class="alert alert-danger">' + result.description ? result.description : JSON.stringify(result.error) + '</p>');
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
						$(appElement).find('.app-routes').html('<span style="color: red;">' + routeResult.description ? routeResult.description : JSON.stringify(routeResult.error) + '</span>');
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
		$('#appsBody input[data-id]').on('keyup click', function(e)
		{
			if(!e.keyCode)
			{
				e.stopImmediatePropagation();
			}
			
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

			var instanceInput = $(this).find('input[name="instance"]');
			var memoryInput = $(this).find('input[name="memory"]')
			
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
							
							instanceInput.attr('data-value', item.entity.instances);
							memoryInput.attr('data-value', item.entity.memory);
	
							app.item = item;
							
							sacleTd.find('*').hide();
							
							var updatedMessage = $('<span style="color: #337ab7; display:inline; font-size:12px;">Updated.</span>');
							tr.find('td:last').append(updatedMessage);
							
							setTimeout(function()
							{
								$(updatedMessage).remove();
							}, 1000 * UPDATE_SCALE_SUCCESS_MESSAGE_TIME);
						}
						else
						{
							sacleTd.find('span[data-id="cancelScale"]').click();
							var desc = $($('#scaleResultTemplate').html().replace('{description}', result.description ? result.description : JSON.stringify(result.error)));
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
	
	var setAppList = function(appsUrl, callback, isTimerRefresh)
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
				
				if(!isTimerRefresh)
				{
					var selectedApp = $('#appsBody tr.selected');
					if(selectedApp.length == 0)
					{
						if(selectedAppGuid)
						{
							selectedApp = $('tr[data-guid="' + selectedAppGuid + '"]');
						}
						else
						{
							selectedApp = $('#appsProgress').parent().parent().next();
						}
					}
					
					selectedApp.click();
					selectedAppGuid = selectedApp.get(0).item.metadata.guid;
				}
				else
				{
					$('tr[data-guid="' + selectedAppGuid + '"]').addClass('selected');
				}
				
				$('#appDetailTab').show();
				
				pumpkin.execute([{name : 'getAppRoutes', params : {appList : appList}}], function()
				{
					$('#refreshAppList').removeAttr('data-state').css('animation-name', '');
				});
				
				if(callback)
					callback();
				
				$('#appsBody tr .app-name span:first-child').on('click', function(e)
				{
					e.stopPropagation();
					e.preventDefault();
					
					var target = $(this);
					target.attr('contenteditable', '').focus();
					
					var prev = $(target).text();
					
					var app = $(this).parent().parent().get(0).item;
					
					var message = $(this).parent().find('.app-name-message');
					
					target.off('blur').on('blur', function()
					{
						var name = $(this).text();
						$(this).removeAttr('contenteditable');
						
						$('<span class="glyphicon glyphicon-refresh small-progress" style="display: inline-block; font-size:10px;"></span>').insertAfter(this);
						
						var that = this;
						CF.async({url : '/v2/apps/' + app.metadata.guid, method : 'PUT', form : {name : name}}, function(result)
						{
							$(that).next().remove();
							if(result)
							{
								if(result.entity)
								{
									message.text('Updated').css('color', '#337ab7');
									setTimeout(function()
									{
										message.text('');
									}, 3000);
								}
								else
								{
									target.text(prev);
									message.text(result.description ? result.description : JSON.stringify(result.error)).css('color', 'red');
									setTimeout(function()
									{
										message.text('');
									}, 10000);
								}
							}
							else
							{
								target.text(prev);
								message.text('Unknown Error.').css('color', 'red');
								setTimeout(function()
								{
									message.text('');
								}, 3000);
							}
						});
					});
					
					$(target).off('keydown').on('keydown', function(e)
					{
						if(e.keyCode == 13)
						{
							$(this).blur();
							e.preventDefault();
							e.stopPropagation();
						}
						else if(e.keyCode == 27)
						{
							$(this).text(prev);
							$(this).removeAttr('contenteditable').off('blur').off('keyup').blur();
							e.preventDefault();
							e.stopPropagation();
						}
					});
				});
			}
			else
			{
				$('#appDetailTab').hide();
				if(callback)
					callback();
			}
		});
	}
	
	var setAppDetails = function()
	{
		$('#appsBody tr').off('click').on('click', function()
		{
			selectedAppGuid = this.item.metadata.guid;
			
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
			
			detail.remove();
			
			$('head').find('*[data-type="details"]').remove();
			$('head').append('<script data-type="details" src="/modules/main/views/js/organization/app_' + type + '.js"></script>');
			$('head').append('<link data-type="details" href="/modules/main/views/css/organization/app_' + type + '.css" rel="stylesheet">');
			_ee.emit('app_detail_' + type, context, app);
			
			context.show();
			
			$('#appDetailTab a[role="tab"]').off('click').on('click', function(e)
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
				_ee.emit('app_detail_clicked', name);
			});
			
			// 앱 상태
			var app = this.item;
			if(app.entity.state == 'STARTED')
			{
				$('#startApp').hide();
				$('#stopApp').show();
				$('#restartApp').show();
			}
			else
			{
				$('#startApp').show();
				$('#stopApp').hide();
				$('#restartApp').hide();
			}
			
			checkState(app);
		});
	};
	
	_ee.on('hashchange', function()
	{
		selectedAppGuid = null;
		
		_IntervalTimer.end('refresh_app_list');
		$('.refresh-app-list-description').text('');
		
		if(_global.hash.space)
		{
			var space = $('#' + _global.hash.space).get(0);
			if(space)
			{
				_ee.emit('space_selected', space.item);
				
				$('#appsBody tr').hide();
				$('#appsProgress').parent().parent().show();
				$('#appDetailTab').hide();
				
				$('#appsProgress .progress-message').text('Applications loading...');
				setAppList(space.item.entity.apps_url, function()
				{
					_IntervalTimer.start('refresh_app_list');
				});
			}
		}
	});

	_ee.on('orgList_done', function()
	{
		var space = null;
		if(_global.hash.space)
		{
			space = $('#' + _global.hash.space).get(0);
			if(!space)
			{
				space = $('#orgList li li').get(0);
			}
		}
		else
		{
			space = $('#orgList li li').get(0);
		}
		
		if(space)
		{
			if(_global.hash.space == space.item.metadata.guid)
			{
				_ee.emit('space_selected', space.item);
				setAppList(space.item.entity.apps_url, function()
				{
					_IntervalTimer.start('refresh_app_list');
				});
			}
			else
			{
				_global.hash.space = space.item.metadata.guid;
				_global.makeHash();
			}
		}
		else
		{
//			$('#mainMenus ul:first').remove();
//			$('.org-body > div').remove();
//			$('.org-body').append('<div class="alert alert-warning" role="alert" style="margin-top: 20px; text-align: center;">You have no any organization.</div>');
		}
	});
	
	var updateAppState = new Pumpkin();
	updateAppState.addWork('startApp', function()
	{
		var app = $('#appsBody tr.selected').get(0).item;
		var td = $('#appsBody tr.selected td:first').html('Starting...');
		
		var next = this.next;
		var error = this.error;
		
		CF.async({url : '/v2/apps/' + app.metadata.guid, method : 'PUT', headers : {'Content-Type' : 'application/x-www-form-urlencoded'}, form : {state : 'STARTED'}}, function(result)
		{
			if(result)
			{
				if(result.entity && result.entity.state == 'STARTED')
				{
					app.entity.state = result.entity.state;
					checkState(app);
					td.html('<span class="glyphicon glyphicon-refresh small-progress" style="display: inline-block;"></span>').css('color', '');
					next();
				}
				else
				{
					td.text(result.description ? result.description : JSON.stringify(result.error)).css('color', 'red');
					error();
				}
			}
			else
			{
				td.text('Unknown Error.').css('color', 'red');
				error();
			}
		});
	});
	
	updateAppState.addWork('stopApp', function(that)
	{
		var app = $('#appsBody tr.selected').get(0).item;
		var td = $('#appsBody tr.selected td:first').html('Stopping...');
		
		var next = this.next;
		var error = this.error;
		
		CF.async({url : '/v2/apps/' + app.metadata.guid, method : 'PUT', headers : {'Content-Type' : 'application/x-www-form-urlencoded'}, form : {state : 'STOPPED'}}, function(result)
		{
			if(result)
			{
				if(result.entity && result.entity.state == 'STOPPED')
				{
					app.entity.state = result.entity.state;
					td.html('<span class="text-muted glyphicon glyphicon-pause"></span> <span>Stopped</span>').css('color', '');
					next();
				}
				else
				{
					td.text(result.description ? result.description : JSON.stringify(result.error)).css('color', 'red');
					error();
				}
			}
			else
			{
				td.text('Unknown Error.').css('color', 'red');
				error();
			}
		});
	});
	
	$(document).ready(function()
	{
		_IntervalTimer.addTimer('refresh_app_list', APP_REFRESH_TIME, function(start)
		{
			$('.refresh-app-list-description').text('Refreshing...');
			$('#refreshAppList').css('animation-name', 'progress').attr('data-state', 'on');
			var space = $('#' + _global.hash.space).get(0);
			setAppList(space.item.entity.apps_url, function()
			{
				if($('#appFilter').val())
				{
					$('#appsBody tr').hide();
					$('#appsBody tr .app-name span:first-child:contains(' + $('#appFilter').val() + ')').parent().parent().show();
				}
				
				$('.refresh-app-list-description').text('');
				$('#refreshAppList').css('animation-name', 'none').attr('data-state', 'off');
				start();
			}, true);
		},
		function(count)
		{
			var min = Math.floor(count / 60);
			var second = count % 60;
			
			if(min < 10)
				min = '0' + min;
			if(second < 10)
				second = '0' + second;
			
			$('.refresh-app-list-description').text(min + ':' + second);
		});
		
		$('#refreshAppList').on('click', function()
		{
			_IntervalTimer.end('refresh_app_list');
			var state = $(this).attr('data-state');
			if(state != 'on')
			{
				var space = $('#' + _global.hash.space).get(0);
				$(this).css('animation-name', 'progress').attr('data-state', 'on');
				setAppList(space.item.entity.apps_url, function()
				{
					$('.refresh-app-list-description').text('');
					$('#refreshAppList').css('animation-name', 'none').attr('data-state', 'off');
					
					if($('#appFilter').val())
					{
						$('#appsBody tr').hide();
						$('#appsBody tr .app-name span:first-child:contains(' + $('#appFilter').val() + ')').parent().parent().show();
					}
							
					_IntervalTimer.start('refresh_app_list');
				});
			}
			else
			{
				$('.refresh-app-list-description').text('Refreshing...');
			}
		});
		
		
		confirmButton('#startApp', function(done)
		{
			var that = this;
			updateAppState.execute(['startApp'], function()
			{
				var app = $('#appsBody tr.selected').get(0).item;
				if(app.entity.state == 'STARTED')
				{
					$('#startApp').hide();
					$('#stopApp').show();
					$('#restartApp').show();
				}
				else
				{
					$('#startApp').show();
					$('#stopApp').hide();
					$('#restartApp').hide();
				}
				
				done();
				
//				$(that).prev().remove();
//				$(that).next().show().next().show();
				
				_ee.emit('setAppList_done', $('#appsBody').get(0).item);
			},
			function()
			{
				var app = $('#appsBody tr.selected').get(0).item;
				if(app.entity.state == 'STARTED')
				{
					$('#startApp').hide();
					$('#stopApp').show();
					$('#restartApp').show();
				}
				else
				{
					$('#startApp').show();
					$('#stopApp').hide();
					$('#restartApp').hide();
				}
				
				done();
				
//				$(that).prev().remove();
//				$(that).show().next().hide().next().hide();
			});
		});
		
		confirmButton('#stopApp', function(done)
		{
			var that = this;
			updateAppState.execute(['stopApp'], function()
			{
//				$(that).prev().remove();
//				$(that).prev().show();
//				$(that).next().hide();
				
				var app = $('#appsBody tr.selected').get(0).item;
				if(app.entity.state == 'STARTED')
				{
					$('#startApp').hide();
					$('#stopApp').show();
					$('#restartApp').show();
				}
				else
				{
					$('#startApp').show();
					$('#stopApp').hide();
					$('#restartApp').hide();
				}
				
				_ee.emit('setAppList_done', $('#appsBody').get(0).item);
				
				done();
			},
			function()
			{
//				$(that).prev().remove();
//				$(that).show().next().show();
//				$(that).prev().hide();
				
				var app = $('#appsBody tr.selected').get(0).item;
				if(app.entity.state == 'STARTED')
				{
					$('#startApp').hide();
					$('#stopApp').show();
					$('#restartApp').show();
				}
				else
				{
					$('#startApp').show();
					$('#stopApp').hide();
					$('#restartApp').hide();
				}
				
				done();
			});
		});
		
		confirmButton('#restartApp', function(done)
		{
			var that = this;
			var td = $('#appsBody tr.selected td:first').html('Restaging...');
			
			var app = $('#appsBody tr.selected').get(0).item;
			CF.async({url : '/v2/apps/' + app.metadata.guid + '/restage', method : 'POST'}, function(result)
			{
				if(result)
				{
					if(result.entity && result.entity.state == 'STARTED')
					{
						app.entity.state = result.entity.state;
						td.html('<span class="glyphicon glyphicon-refresh small-progress" style="display: inline-block;"></span>').css('color', '');
						checkState(app);
					}
					else
					{
						td.text(result.description ? result.description : JSON.stringify(result.error)).css('color', 'red');
					}
				}
				else
				{
					td.text('Unknown Error.').css('color', 'red');
				}
				
				$(that).prev().remove();
				$(that).show().prev().show().prev().hide();
				
				done();
			},
			function(error)
			{
				td.text(JSON.stringify(error)).css('color', 'red');
				
				$(that).prev().remove();
				$(that).show().prev().show().prev().hide();
				
				done();
			});
		});
		
		confirmButton('#deleteApp', function(done)
		{
			$('.delete-message').text('');
			var app = $('#appsBody tr.selected').get(0).item;
			CF.async({url : '/v2/apps/' + app.metadata.guid, method : 'DELETE'}, function(result)
			{
				if(result && result.code)
				{
					$('.delete-message').text(result.description ? result.description : JSON.stringify(result.error));
				}
				else
				{
					_ee.emit('deleted_app', app);
					
					selectedAppGuid = null;
					
					$('.delete-message').text('');
					_IntervalTimer.end('refresh_app_list');
					var space = $('#' + _global.hash.space).get(0);
					$('#refreshAppList').css('animation-name', 'progress').attr('data-state', 'on');
					$('.refresh-app-list-description').text('Refreshing...');
					setAppList(space.item.entity.apps_url, function()
					{
						$('.refresh-app-list-description').text('');
						$('#refreshAppList').css('animation-name', 'none').attr('data-state', 'off');
								
						_IntervalTimer.start('refresh_app_list');
					});
				}
				
				done();
			});
		});
		
		$('#appFilter').on('keyup', function()
		{
			if($(this).val() == '')
			{
				$('#appsBody tr').show();
				$('#appsBody tr:first').hide();
			}
			else
			{
				$('#appsBody tr').hide();
				$('#appsBody tr .app-name span:first-child:contains(' + $(this).val() + ')').parent().parent().show();
			}
		});
		
		$('#removeFilterValue').on('click', function()
		{
			$('#appFilter').val('');
			$('#appsBody tr').show();
			$('#appsBody tr:first').hide();
		});
	});
})();