(function()
{
	var pumpkin = new Pumpkin();
	pumpkin.addWork('getOrgs', function()
	{
		var next = this.next;
		CF.async({url : '/v2/organizations'}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					var html = '';
					var orgList = result.resources;
					for(var i=0; i<orgList.length; i++)
					{
						html += '<option value="' + orgList[i].metadata.guid + '">' + orgList[i].entity.name + '</option>';
					}
					
					$('#orgSelect').html(html).removeAttr('disabled');
					
					next({guid : orgList[0].metadata.guid});
				}
				else
				{
					$('#orgSelect option:first').text(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				$('#orgSelect option:first').text('Unknown Error');
			}
		},
		function(error)
		{
			$('#orgSelect option:first').text(error);
		});
	});
	
	pumpkin.addWork('getSpaces', function(params)
	{
		var next = this.next;
		CF.async({url : '/v2/organizations/' + params.guid + '/spaces'}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					var html = '';
					var spaceList = result.resources;
					for(var i=0; i<spaceList.length; i++)
					{
						html += '<option value="' + spaceList[i].metadata.guid + '">' + spaceList[i].entity.name + '</option>';
					}
					
					$('#spaceSelect').html(html).removeAttr('disabled');
				}
				else
				{
					$('#spaceSelect option:first').text(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				$('#spaceSelect option:first').text('Unknown Error');
			}
			
			next();
		},
		function(error)
		{
			$('#spaceSelect option:first').text(error);
		});
	});
	
	pumpkin.addWork('getApps', function(params)
	{
		var next = this.next;
		CF.async({url : '/v2/spaces/' + params.guid + '/apps'}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					var html = '';
					var appList = result.resources;
					for(var i=0; i<appList.length; i++)
					{
						html += '<option value="' + appList[i].metadata.guid + '">' + appList[i].entity.name + '</option>';
					}
					
					$('#appSelect').html('<option value="">Select a app</option>' + html).removeAttr('disabled');
				}
				else
				{
					$('#appSelect option:first').text(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				$('#appSelect option:first').text('Unknown Error');
			}
			
			next();
		},
		function(error)
		{
			$('#appSelect option:first').text(error);
		});
	});
	
	var getServiceInstanceDetail = new Pumpkin();
	getServiceInstanceDetail.addWork('getServicePlan', function(service)
	{
		var next = this.next;
		var error = this.error;
		
		CF.async({url : service.entity.service_plan_url}, function(result)
		{
			if(result)
			{
				if(result.entity)
				{
					service.plan = result;
					CF.async({url : result.entity.service_url}, function(result)
					{
						if(result)
						{
							if(result.entity)
							{
								service.service = result;
								next();
							}
							else
							{
								error(result.description ? result.description : JSON.stringify(result.error));
							}
						}
						else
						{
							error('Unknown Error');
						}
					},
					function(error)
					{
						error(error);
					});
				}
				else
				{
					error(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				error('Unknown Error');
			}
		},
		function(error)
		{
			error(error);
		});
	});
	
	getServiceInstanceDetail.addWork('getServiceBindings', function(service)
	{
		var next = this.next;
		var error = this.error;
		
		CF.async({url : service.entity.service_bindings_url}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					service.bindings = result.resources;
					next(service);
				}
				else
				{
					error(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				error('Unknown Error');
			}
		},
		function(error)
		{
			error(error);
		});
	});
	
	var getServices = function()
	{
		var origin = $('#serviceTable');
		var clone = origin.clone();
		clone.insertAfter(origin);
		origin.remove();
		
		var progress = clone.find('tbody tr:first').show();
		clone.find('tbody').html('').append(progress);
		
		var guid = $('#spaceSelect').val();
		CF.async({url : '/v2/spaces/' + guid + '/service_instances'}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					var serviceList = result.resources;
					var forEach = new ForEach();
					forEach.async(serviceList, function(service, index)
					{
						var done = this.done;
						
						var worker = new Pumpkin();
						worker.state = 0;
						worker.data = getServiceInstanceDetail.data;
						worker.works = getServiceInstanceDetail.works;
						
						var workList = [];
						workList.push({name : 'getServicePlan', params : service});
						workList.push({name : 'getServiceBindings', params : service});
						worker.executeAsync(workList, function(serviceInstance)
						{
							var template = $('#serviceRowTemplate').html();
							template = template.replace('{description}', serviceInstance.service.entity.label).replace('{name}', serviceInstance.entity.name).replace('{boundApps}', serviceInstance.bindings.length);
							template = template.replace('{manageUrl}', serviceInstance.entity.dashboard_url);
							
							var imageUrl = '';
							var docsUrl = '';
							var supportUrl = '';
							if(serviceInstance.service.entity.extra)
							{
								var extra = JSON.parse(serviceInstance.service.entity.extra);
								imageUrl = extra.imageUrl;
								
								serviceInstance.service.entity.extra = extra;
							}
							
							template = template.replace('{imgUrl}', imageUrl);
							
							if(serviceInstance.plan.entity.extra)
							{
								var extra = JSON.parse(serviceInstance.plan.entity.extra);
								serviceInstance.plan.entity.extra = extra;
								
								supportUrl = serviceInstance.service.entity.extra.supportUrl;
								docsUrl = serviceInstance.service.entity.extra.documentationUrl;
								
								if(extra.costs)
								{
									var costs = extra.costs[0];
									template = template.replace('{plan}', '$' + costs.amount.usd + ' / ' + costs.unit + ' <br> (' + serviceInstance.plan.entity.name + ')');
								}
								else if(extra.displayName)
								{
									template = template.replace('{plan}', extra.displayName + ' <br> (' + serviceInstance.plan.entity.name + ')');
								}
							}
							else
							{
								template = template.replace('{plan}', 'User Provided <br> (' + serviceInstance.plan.entity.name + ')');
							}
							
							template = template.replace('{supportUrl}', supportUrl).replace('{docsUrl}', docsUrl);
							
							template = $(template).hide();
							template.get(0).item = serviceInstance;
							
							serviceInstance.element = template;
							
							if(!imageUrl)
								template.find('img').remove();
							
							clone.find('tbody').append(template);
							
							done();
						},
						function(workName, error)
						{
							clone.find('tbody').append('<tr><td colspan="5" style="text-align: center; color: red;">' + error + '</td></tr>');
						});
					},
					function()
					{
						getUserProvidedService(clone, function(list)
						{
							if(serviceList.length == 0 && list.length == 0)
								clone.find('tbody').append('<tr><td colspan="5" style="text-align:center;">no services</td></tr>');
							
							clone.find('tbody tr').show();
							progress.hide();
							
							if(serviceList.length > 0 || list.length > 0)
								setDetails();
						});
					});
				}
				else
				{
					clone.find('.progress-row').hide();
					clone.find('tbody').append('<tr><td colspan="5" style="text-align: center; color: red;">' + (result.description ? result.description : JSON.stringify(result.error)) + '</td></tr>');
				}
			}
			else
			{
				clone.find('.progress-row').hide();
				clone.find('tbody').append('<tr><td colspan="5" style="text-align: center; color: red;">Unknown Error</td></tr>');
			}
		},
		function(error)
		{
			clone.find('.progress-row').hide();
			clone.find('tbody').append('<tr><td colspan="5" style="text-align: center; color: red;">' + error + '</td></tr>');
		});
	};
	
	var getUserProvidedService = function(clone, callback)
	{
		var guid = $('#spaceSelect').val();
		CF.async({url : '/v2/user_provided_service_instances?q=space_guid:' + guid}, function(result)
		{
			if(result)
			{
				var list = result.resources;
				if(list)
				{
					for(var i=0; i<list.length; i++)
					{
						(function(instance)
						{
							instance.isCups = true;
							var template = $('#serviceRowTemplate').html();
							template = $(template.replace('{description}', 'user-provided-service').replace('{name}', instance.entity.name).replace('{plan}', ''));
							
							instance.element = template;
							
							CF.async({url : instance.entity.service_bindings_url}, function(result)
							{
								var td = $(template).find('td:nth-child(3)');
								if(result)
								{
									var bindings = result.resources;
									if(bindings)
									{
										instance.bindings = bindings;
										td.html(bindings.length);
									}
									else
									{
										td.html('<span style="color: red; font-size: 11px;>' + (result.description ? result.description : JSON.stringify(result.error)) + '</span>');
									}
								}
								else
								{
									td.html('<span style="color: red; font-size: 11px;>Unknown Error</span>');
								}
							});
							
							template.get(0).item = instance;
							
							template.find('td:last').html('');
							
							clone.find('tbody').append(template);
						})(list[i]);
					}
					
					callback(list);
				}
				else
				{
					clone.find('.progress-row').hide();
					clone.find('tbody').append('<tr><td colspan="5" style="text-align: center; color: red;">' + (result.description ? result.description : JSON.stringify(result.error)) + '</td></tr>');
				}
			}
			else
			{
				clone.find('.progress-row').hide();
				clone.find('tbody').html('<tr><td colspan="5" style="text-align: center; color: red;">Unknown Error</td></tr>');
			}
		});
	};
	
	var setDetailsPumpkin = new Pumpkin();
	setDetailsPumpkin.addWork('setBindings', function(serviceInstance)
	{
		var next = this.next;
		
		$('#bindings .binding-table tbody').html('');
		var forEach = new ForEach();
		forEach.async(serviceInstance.bindings, function(binding, index)
		{
			var done = this.done;
			CF.async({url : binding.entity.app_url}, function(result)
			{
				var template = $('#boundAppRowTemplate').html();
				if(result)
				{
					if(result.entity)
					{
						template = template.replace('{name}', result.entity.name);
						template = $(template);
						template.get(0).item = binding;
					}
					else
					{
						template = template.replace('{name}', result.description ? result.description : JSON.stringify(result.error));
					}
				}
				else
				{
					template = template.replace('{name}', 'Unknown Error');
				}
				
				$('#bindings .binding-table tbody').append(template);
				
				done();
			},
			function(error)
			{
				template = template.replace('{name}', error);
				$('#bindings .binding-table tbody').append(template);
				done();
			});
		},
		function()
		{
			if(serviceInstance.bindings.length == 0)
				$('#bindings .binding-table tbody').append('<tr><td colspan="2" style="text-align: center;">no bound apps.</td></tr>');

			$('#bindings .binding-table tbody .unbind').each(function()
			{
				var that = this;
				confirmButton(this, function(done)
				{
					var binding = $(that).parent().parent().get(0).item;
					CF.async({url : binding.metadata.url, method : 'DELETE'}, function(result)
					{
						if(result)
						{
							if(result.code)
							{
								$(that).next().text(result.description ? result.description : JSON.stringify(result.error));
							}
						}

						var item = $('#serviceTable tbody tr.selected').get(0).item;
						for(var i=0; i<item.bindings.length; i++)
						{
							if(item.bindings[i].metadata.url == binding.metadata.url)
							{
								item.bindings.splice(i, 1);
								break;
							}
						}
						
						var boundApp = $('#serviceTable tbody tr.selected td:nth-child(3)').text();
						boundApp = new Number(boundApp);
						$('#serviceTable tbody tr.selected td:nth-child(3)').text(--boundApp);
						
						$(that).parent().parent().remove();
						
						if($('.binding-table tbody tr').length == 0)
							$('.binding-table tbody').append('<tr><td colspan="2" style="text-align: center;">no bound apps.</td></tr>');
						
						done();
					},
					function(error)
					{
						$(that).next().text(error);
					});
				});
			});
			
			next(serviceInstance);
		});
	});
	
	var selectPlan = function(serviceInstance, plan, successTarget, errorTarget)
	{
		$('<span class="glyphicon glyphicon-refresh small-progress"></span>').insertBefore(successTarget);
		$(successTarget).hide().prev().css('display', 'inline-block');
		
		CF.async({url : '/v2/service_instances/' + serviceInstance.metadata.guid, method : 'PUT', headers : {'Content-Type' : 'application/x-www-form-urlencoded'}, form : {service_plan_guid : plan.metadata.guid}}, function(result)
		{
			$(successTarget).show().prev().remove();
			if(result)
			{
				if(result.entity)
				{
					$('.bullets').find('.selected-plan').removeAttr('disabled', '').removeClass('btn-info').addClass('btn-primary').addClass('select-plan').removeClass('selected-plan').text('Select this plan');
					$(successTarget).attr('disabled', '').removeClass('btn-primary').addClass('btn-info').addClass('selected-plan').removeClass('select-plan').text('Selected');
				}
				else
				{
					$(errorTarget).text(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				$(errorTarget).text('Unknown Error');
			}
		},
		function(error)
		{
			$(errorTarget).text(error);
		});
	};
	
	setDetailsPumpkin.addWork('setPlan', function(serviceInstance)
	{
		var next = this.next;
		
		$('.plans-table tbody').html('');
		if(!serviceInstance.service)
		{
			next();
			return;
		}
		
		CF.async({url : serviceInstance.service.entity.service_plans_url}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					var planList = result.resources;

					var th = null;
					var tr = null;
					
					for(var i=0; i<planList.length; i++)
					{
						if(th == null && tr == null)
						{
							th = $('<tr></tr>');
							tr = $('<tr></tr>');
						}
						
						var nameTh = $('<th><p class="plan-name">' + planList[i].entity.name + '</p></th>');
						th.append(nameTh);
						
						var td = $('<td class="bullets" valign="top"></td>');
						tr.append(td);
						if(planList[i].entity.extra)
						{
							planList[i].entity.extra = JSON.parse(planList[i].entity.extra);
							if(planList[i].entity.extra.costs)
								$('<span>$' + planList[i].entity.extra.costs[0].amount.usd + ' / ' + planList[i].entity.extra.costs[0].unit + '</span>').insertAfter(nameTh.find('span'));
							
							var bullets = planList[i].entity.extra.bullets;
							if(bullets)
							{
								var html = '<ul>';
								for(var j=0; j<bullets.length; j++)
								{
									html += '<li>' + bullets[j] + '</li>';
								}
								
								html += '</ul>';
								
								td.append(html);
							}
						}
						
						if(serviceInstance.plan.metadata.guid != planList[i].metadata.guid)
						{
							var div = $('<div style="text-align: center;"><button type="button" class="btn btn-primary select-plan">Select this plan</button><p class="message"></p></div></td>');
							div.get(0).item = planList[i];
							
							td.append(div);
						}
						else
						{
							var div = $('<div style="text-align: center;"><button type="button" class="btn btn-info selected-plan" disabled>Selected</button><p class="message"></p></div></td>');
							div.get(0).item = planList[i];
							td.append(div);
						}
						
						if(i != 0 && i%4 == 0)
						{
							$('.plans-table tbody').append(th).append(tr);
							
							tr.find('.select-plan').on('click', function()
							{
								var plan = $(this).parent().get(0).item;
								selectPlan(serviceInstance, plan, this, $(this).next());
							});
							
							th = null;
							tr = null;
						}
					}
					
					if(th && td)
					{
						tr.find('.select-plan').on('click', function()
						{
							var plan = $(this).parent().get(0).item;
							selectPlan(serviceInstance, plan, this, $(this).next());
						});
						
						$('.plans-table tbody').append(th).append(tr);
					}
				}
				else
				{
					$('.plans-table tbody').append('<tr><td colspan="5">' + (result.description ? result.description : JSON.stringify(result.error)) + '</td></tr>');
				}
			}
			else
			{
				$('.plans-table tbody').append('<tr><td colspan="5">Unknown Error</td></tr>');
			}
			
			next();
		});
	});
	
	setDetailsPumpkin.addWork('setSettings', function(serviceInstance)
	{
		$('#settings input[name="name"]').val(serviceInstance.entity.name).get(0).item = serviceInstance;
		this.next();
	});
	
	var refreshSettingCredentials = function(serviceInstance)
	{
		$('#credentialsGroup').html('<p class="label-for-input">Credentials</p>');
		if(serviceInstance.isCups)
		{
			for(var key in serviceInstance.entity.credentials)
			{
				var html = $('#cupsTemplate').html();
				html = $(html.replace('{key}', key).replace('{value}', serviceInstance.entity.credentials[key]));
				
				$(html).find('button').on('click', function()
				{
					$(this).parent().parent().remove();
				});
				
				$('#credentialsGroup').append(html);
			}
			
			var html = $('#cupsTemplate').html();
			html = $(html.replace('{key}', '').replace('{value}', ''));
			html.find('button').attr('data-id', 'addCupsKeyValues').find('span').attr('class', 'glyphicon glyphicon-plus');
			
			$(html).find('button').on('click', function()
			{
				var clone = $(this).parent().parent().clone();
				$(clone).insertBefore($(this).parent().parent());
				
				$(clone).find('button').html('<span class="glyphicon glyphicon-minus"></span>').off('click').on('click', function()
				{
					$(this).parent().parent().remove();
				});
				
				$(this).parent().parent().find('input').val('');
			});
			
			$('#credentialsGroup').append(html);
			$('#serviceDetailTab a[href="#plan"]').hide();
			$('#credentialsGroup').show();
		}
		else
		{
			$('#serviceDetailTab a[href="#plan"]').show();
			$('#credentialsGroup').hide();
		}
	}
	
	var setDetails = function()
	{
		$('#serviceTable tbody tr').off('click').on('click', function()
		{
			$("#settings .message").text('');
			$('.detailProgress').show();
			
			$('.tab-pane.active').removeClass('active');
			
			$('#serviceTable tbody tr.selected').removeClass('selected');
			$(this).addClass('selected');
			
			var serviceInstance = this.item;
			$('#serviceDetails').show();
			
			$('#credentialsGroup').html('<p class="label-for-input">Credentials</p>');
			if(serviceInstance.isCups)
			{
				for(var key in serviceInstance.entity.credentials)
				{
					var html = $('#cupsTemplate').html();
					html = $(html.replace('{key}', key).replace('{value}', serviceInstance.entity.credentials[key]));
					
					$(html).find('button').on('click', function()
					{
						$(this).parent().parent().remove();
					});
					
					$('#credentialsGroup').append(html);
				}
				
				var html = $('#cupsTemplate').html();
				html = $(html.replace('{key}', '').replace('{value}', ''));
				html.find('button').attr('data-id', 'addCupsKeyValues').find('span').attr('class', 'glyphicon glyphicon-plus');
				
				$(html).find('button').on('click', function()
				{
					var clone = $(this).parent().parent().clone();
					$(clone).insertBefore($(this).parent().parent());
					
					$(clone).find('button').html('<span class="glyphicon glyphicon-minus"></span>').off('click').on('click', function()
					{
						$(this).parent().parent().remove();
					});
					
					$(this).parent().parent().find('input').val('');
				});
				
				$('#credentialsGroup').append(html);
				$('#serviceDetailTab a[href="#plan"]').hide();
				$('#credentialsGroup').show();
			}
			else
			{
				$('#serviceDetailTab a[href="#plan"]').show();
				$('#credentialsGroup').hide();
			}
			
			var workList = [];
			workList.push({name : 'setBindings', params : serviceInstance});
			workList.push({name : 'setPlan', params : serviceInstance});
			workList.push({name : 'setSettings', params : serviceInstance});
			
			pumpkin.execute([{name : 'getApps', params : {guid : $('#spaceSelect').val()}}], function()
			{
			});
			
			setDetailsPumpkin.executeAsync(workList, function()
			{
				var id = $('#serviceDetailTab >ul > li.active').children('a').attr('aria-controls');
				$('#' + id).addClass('active');
				$('.detailProgress').hide();
				$('html, body').animate({scrollTop:document.body.scrollHeight});
			});
		});
		
		$('#serviceTable tbody tr:nth-child(2)').click();
	};
	
	var bindingService = function(binding, callback)
	{
		var template = $('#boundAppRowTemplate').html();
		template = template.replace('{name}', binding.entity.name);
		template = $(template);
		template.get(0).item = binding;
		
		$('#bindings .binding-table tbody td[colspan="2"]').parent().remove();
		$('#bindings .binding-table tbody').append(template);
		
		confirmButton(template.find('.unbind'), function(done)
		{
			var that = this;
			CF.async({url : binding.metadata.url, method : 'DELETE'}, function(result)
			{
				if(result)
				{
					if(result.code)
					{
						$(that).next().text(result.description ? result.description : JSON.stringify(result.error));
					}
				}

				var item = $('#serviceTable tbody tr.selected').get(0).item;
				for(var i=0; i<item.bindings.length; i++)
				{
					if(item.bindings[i].metadata.url == binding.metadata.url)
					{
						item.bindings.splice(i, 1);
						break;
					}
				}
				
				var boundApp = $('#serviceTable tbody tr.selected td:nth-child(3)').text();
				boundApp = new Number(boundApp);
				$('#serviceTable tbody tr.selected td:nth-child(3)').text(--boundApp);
				
				$(that).parent().parent().remove();
				
				if($('.binding-table tbody tr').length == 0)
					$('.binding-table tbody').append('<tr><td colspan="2" style="text-align: center;">no bound apps.</td></tr>');
				
				done();
			},
			function(error)
			{
				$(that).next().text(error);
			});
		});
		
		callback();
	};
	
	$(document).ready(function()
	{
		pumpkin.execute(['getOrgs', 'getSpaces'], function()
		{
			if(!$('#spaceSelect').val())
			{
				$('#spaceSelect').html('<option value="" disabled selected>no spaces</option>');
				$('#serviceTable tbody').append('<tr><td colspan="5" style="text-align:center;">no services</td></tr>').find('tr:first').hide();
			}
			else
			{
				getServices();
			}
		});
		
		$('#orgSelect').on('change', function()
		{
			$('.tab-pane.active').removeClass('active');
			$('#spaceSelect').html('<option value="" disabled selected>Spaces Loading...</option>');
			pumpkin.execute([{name : 'getSpaces', params : {guid : $(this).val()}}], function()
			{
				if(!$('#spaceSelect').val())
				{
					$('#spaceSelect').html('<option value="" disabled selected>no spaces</option>');
					$('#serviceTable tbody').append('<tr><td colspan="5" style="text-align:center;">no services</td></tr>').find('tr:first').hide();
				}
				else
				{
					getServices();

					pumpkin.execute([{name : 'getApps', params : {guid : $('#spaceSelect').val()}}], function()
					{
						
					});
				}
			});
		});
		
		$('#spaceSelect').on('change', function()
		{
			$('.tab-pane.active').removeClass('active');
			if($(this).val() == '')
			{
				if(this.init)
					return;
				
				this.init = true;
				
				var that = this;
				$('#spaceSelect').html('<option value="">Spaces Loading...</option>').attr('disabled', '');
				pumpkin.execute([{name : 'getSpaces', params: {guid : guid}}], function()
				{
					$('#spaceSelect').removeAttr('disabled');
					that.init = false;
				});
			}
			else
			{
				getServices();
				
				pumpkin.execute([{name : 'getApps', params : {guid : $(this).val()}}], function()
				{
					
				});
			}
		});
		
		formSubmit($('#bindings form'), function(data)
		{
			$("#bindings .bind-message").text('');
			$('#bindings input[type="submit"]').hide().next().hide();
			$('#bindings .small-progress').css('display', 'inline-block');
			
			var serviceInstance = $('#settings input[name="name"]').get(0).item;
			data.service_instance_guid = serviceInstance.metadata.guid;
			
			CF.async({url : '/v2/service_bindings', method : 'POST', headers : {'Content-Type' : 'application/x-www-form-urlencoded'}, form : data}, function(result)
			{
				if(result)
				{
					if(result.entity)
					{
						result.entity.name = $('#appSelect option:selected').text();
						bindingService(result, function()
						{
							var boundApp = $('#serviceTable tbody tr.selected td:nth-child(3)').text();
							boundApp = new Number(boundApp);
							$('#serviceTable tbody tr.selected td:nth-child(3)').text(++boundApp);
							
							$('#bindings .small-progress').hide().next().show().next().show();
							$('#appSelect').val('').removeAttr('disabled');
						});
					}
					else
					{
						$('#bindings .small-progress').hide().next().show().next().show();
						$('#appSelect').val('').removeAttr('disabled');
						$("#bindings .bind-message").text(result.description ? result.description : JSON.stringify(result.error));
					}
				}
				else
				{
					$('#bindings .small-progress').hide().next().show().next().show();
					$('#appSelect').val('').removeAttr('disabled');
					$("#bindings .bind-message").text('Service binding is failed.');
				}
			},
			function(error)
			{
				$('#bindings .small-progress').hide().next().show().next().show();
				$('#appSelect').val('').removeAttr('disabled');
				$("#bindings .bind-message").text(error);
			});
		});
		
		formSubmit($('#settings form'), function(data)
		{
			$("#settings .message").text('');
			$('#settings input[type="submit"]').hide().next().hide();
			$('#settings .small-progress').css('display', 'inline-block');
			
			var serviceInstance = $('#settings input[name="name"]').get(0).item;
			
			if(serviceInstance.isCups)
			{
				var credentials = {};
				if(typeof data.key != 'string')
				{
					for(var i=0; i<data.key.length; i++)
					{
						if(data.key[i])
							credentials[data.key[i]] = data.value[i];
					}
				}
				else
				{
					if(data.key)
						credentials[data.key] = data.value;
				}
				
				data.credentials = credentials;
				delete data.key;
				delete data.value;
			}
			
			CF.async({url : serviceInstance.metadata.url, method : 'PUT', headers : {'Content-Type' : 'application/json'}, form : data}, function(result)
			{
				if(result)
				{
					if(result.entity)
					{
						result.isCups = serviceInstance.isCups;
						refreshSettingCredentials(result);
						
						$('#settings .small-progress').hide().next().show().next().show().next().text('Updated.').css('color', '#286090');
						serviceInstance.element.find('td:nth-child(2)').text(result.entity.name);
						
						setTimeout(function()
						{
							$('#settings .message').text('').css('color', '');
						}, 3000);
					}
					else
					{
						$("#settings .message").text(result.description ? result.description : JSON.stringify(result.error)).prev().prev().prev().hide();
						setTimeout(function()
						{
							$('#settings .message').text('').css('color', '').prev().show().prev().show();
						}, 3000);
					}
				}
				else
				{
					$("#settings .message").text('Unknown Error').prev().prev().prev().hide();
					setTimeout(function()
					{
						$('#settings .message').text('').css('color', '').prev().show().prev().show();
					}, 3000);
				}
			},
			function(error)
			{
				$("#settings .message").text(error).prev().prev().prev().hide();
				setTimeout(function()
				{
					$('#settings .message').text('').css('color', '').prev().show().prev().show();
				}, 3000);
			});
		});
		
		confirmButton($('#deleteServiceInstance'), function(done)
		{
			$("#settings .message").text('');
			$('#settings input[type="submit"]').hide();
			
			var serviceInstance = $('#settings input[name="name"]').get(0).item;
			
			CF.async({url : serviceInstance.metadata.url, method : 'DELETE'}, function(result)
			{
				if(result)
				{
					if(result.code)
					{
						$('#settings input[type="submit"]').show();
						$("#settings .message").text(result.description ? result.description : JSON.stringify(result.error));
						done();
						return;
					}
				}
				
				var item = $('#serviceTable tbody tr.selected').get(0).item;
				
				$('#serviceDetails').hide();
				$('#settings input[type="submit"]').show();
				serviceInstance.element.remove();
				done();
			},
			function(error)
			{
				$('#settings input[type="submit"]').show();
				$("#settings .message").text(error);
				done();
			});
		});
		
		$('#cups').on('click', function()
		{
			$('#createUserProvidedServiceDialog .modal-body input').val('');
			var row = $('#createUserProvidedServiceDialog .form-row');
			for(var i=row.length-1; i>=2; i--)
			{
				$(row[i]).remove();
			}
			$('#createUserProvidedServiceDialog').modal('show');
		});
		
		$('button[data-id="addCupsKeyValues"]').on('click', function()
		{
			var clone = $(this).parent().parent().clone();
			$(clone).insertBefore($(this).parent().parent());
			
			$(clone).find('button').html('<span class="glyphicon glyphicon-minus"></span>').off('click').on('click', function()
			{
				$(this).parent().parent().remove();
			});
			
			$(this).parent().parent().find('input').val('');
		});
		
		$('#cancelCupsDialog').on('click', function()
		{
			$('#createUserProvidedServiceDialog').modal('hide');
		});
		
		formSubmit('#createUserProvidedServiceDialog form', function(data)
		{
			var credentials = {};
			if(typeof data.key != 'string')
			{
				for(var i=0; i<data.key.length; i++)
				{
					if(data.key[i])
						credentials[data.key[i]] = data.value[i];
				}
			}
			else
			{
				if(data.key)
					credentials[data.key] = data.value;
			}
			
			var form = {};
			form.name = data.name;
			form.credentials = credentials;
			form.space_guid = $('#spaceSelect').val();
			
			$('#cupsMessage').prev().css('display', 'inline-block');
			$('#cupsMessage').next().hide().next().hide();
			
			CF.async({url : '/v2/user_provided_service_instances', method : 'POST', headers : {'Content-Type' : 'application/json'}, form : form}, function(result)
			{
				$('#cupsMessage').next().show().next().show();
				
				if(result)
				{
					if(result.entity)
					{
						result.isCups = true;
						result.bindings = [];
						var template = $('#serviceRowTemplate').html();
						template = $(template.replace('{description}', 'user-provided-service').replace('{name}', result.entity.name).replace('{plan}', '').replace('{boundApps}', '0'));
						
						result.element = template;
						template.get(0).item = result;
						template.find('td:last').html('');
						
						$('#serviceTable tbody').append(template);
						
						setDetails();
						$('#cupsMessage').text('').prev().hide();
						$('#createUserProvidedServiceDialog').modal('hide');
					}
					else
					{
						$('#cupsMessage').text(JSON.stringify(result)).prev().hide();
					}
				}
				else
				{
					$('#cupsMessage').text('Unknown Error').prev().hide();
				}
			});
		});
	});
})();