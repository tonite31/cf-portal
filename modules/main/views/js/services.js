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
		var guid = $('#spaceSelect').val();
		CF.async({url : '/v2/spaces/' + guid + '/service_instances'}, function(result)
		{
			if(result)
			{
				var progress = $('#serviceTable tbody tr:first');
				$('#serviceTable tbody').html('').append(progress);
				
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
							
							$('#serviceTable tbody').append(template);
							
							done();
						},
						function(workName, error)
						{
							$('#serviceTable tbody').append('<tr><td colspan="5" style="text-align: center; color: red;">' + error + '</td></tr>');
						});
					},
					function()
					{
						$('#serviceTable tbody tr').show();
						progress.hide();
						
						setDetails();
					});
				}
				else
				{
					$('.progress-row').hide();
					$('#serviceTable tbody').append('<tr><td colspan="5" style="text-align: center; color: red;">' + (result.description ? result.description : JSON.stringify(result.error)) + '</td></tr>');
				}
			}
			else
			{
				$('.progress-row').hide();
				$('#serviceTable tbody').append('<tr><td colspan="5" style="text-align: center; color: red;">Unknown Error</td></tr>');
			}
		},
		function(error)
		{
			$('.progress-row').hide();
			$('#serviceTable tbody').append('<tr><td colspan="5" style="text-align: center; color: red;">' + error + '</td></tr>');
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
						
						if($('.binding-table tbody tr').length == 0)
							$('.binding-table tbody').append('<tr><td colspan="2" style="text-align: center;">no bound apps.</td></tr>');
						
						$(that).parent().parent().remove();
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
		$('<span class="glyphicon glyphicon-refresh small-progress></span>').insertBefore(successTarget);
		$(successTarget).hide().prev().css('display', 'inline-block');
		
		CF.async({url : '/v2/service_instances/' + serviceInstance.metadata.guid, method : 'PUT', headers : {'Content-Type' : 'application/x-www-form-urlencoded'}, form : {service_plan_guid : plan.metadata.guid}}, function(result)
		{
			$(successTarget).show().prev().remove();
			if(result)
			{
				if(result.entity)
				{
					$('.bullets').find('.selected-plan').removeAttr('disabled', '').removeClass('btn-info').addClass('btn-primary').addClass('select-plan').removeClass('selected-plan');
					$(successTarget).attr('disabled', '').removeClass('btn-primary').addClass('btn-info').addClass('selected-plan').removeClass('select-plan');;
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
							$('<span>$' + planList[i].entity.extra.costs[0].amount.usd + ' / ' + planList[i].entity.extra.costs[0].unit + '</span>').insertAfter(nameTh.find('span'));
							
							var bullets = planList[i].entity.extra.bullets;
							var html = '<ul>';
							for(var j=0; j<bullets.length; j++)
							{
								html += '<li>' + bullets[j] + '</li>';
							}
							
							html += '</ul>';
							
							td.append(html);
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
	
	var setDetails = function()
	{
		$('#serviceTable tbody tr').on('click', function()
		{
			$('.detailProgress').show();
			
			$('#serviceTable tbody tr.selected').removeClass('selected');
			$(this).addClass('selected');
			
			var serviceInstance = this.item;
			$('#serviceDetails').show();
			
			var workList = [];
			workList.push({name : 'setBindings', params : serviceInstance});
			workList.push({name : 'setPlan', params : serviceInstance});
			workList.push({name : 'setSettings', params : serviceInstance});
			
			setDetailsPumpkin.executeAsync(workList, function()
			{
				$('.detailProgress').hide();
				$('.binding-table').show();
				$('html, body').animate({scrollTop:document.body.scrollHeight});
			});
		});
	};
	
	$(document).ready(function()
	{
		pumpkin.execute(['getOrgs', 'getSpaces'], function()
		{
			getServices();
		});
		
		$('#orgSelect').on('change', function()
		{
			pumpkin.execute([{name : 'getSpaces', params : {guid : $(this).val()}}], function()
			{
				getServices();
			});
		});
		
		$('#spaceSelect').on('change', function()
		{
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
			}
		});
		
		formSubmit($('#settings form'), function(data)
		{
			$('#settings input[type="submit"]').hide().next().hide();
			$('#settings .small-progress').css('display', 'inline-block');
			
			var serviceInstance = $('#settings input[name="name"]').get(0).item;
			CF.async({url : '/v2/service_instances/' + serviceInstance.metadata.guid, method : 'PUT', headers : {'Content-Type' : 'application/x-www-form-urlencoded'}, form : data}, function(result)
			{
				if(result)
				{
					if(result.entity)
					{
						$('#settings .small-progress').hide().next().show().next().show().next().text('Updated.').css('color', '#286090');
						serviceInstance.element.find('td:nth-child(2)').text(result.entity.name);
						
						setTimeout(function()
						{
							$('#settings .message').text('').css('color', '');
						}, 3000);
					}
					else
					{
						$("#settings .message").text(result.description ? result.description : JSON.stringify(result.error));
					}
				}
				else
				{
					$("#settings .message").text('Unknown Error');
				}
			},
			function(error)
			{
				$("#settings .message").text(error);
			});
		});
		
		confirmButton($('#deleteServiceInstance'), function(done)
		{
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
				
				$('#serviceDetails').hide();
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
	});
})();