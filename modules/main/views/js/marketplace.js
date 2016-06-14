(function()
{
	var selectPlan = function(service, plan)
	{
		var first = $('.parameters:first');
		$('.parameters').remove();
		
		$('.form-row:last').append(first);
		
		$('.modal-form input[type="text"]').val('');
		$('.modal-form select').html('');
		$('#modalMessage').text('');
		
		plan.service = service;
		$('.modal-form .small-progress').hide().next().next().show().next().show();
		$('#selectPlanDialog').modal('show').get(0).item = plan;
		
		$('#modalTitle').html(service.entity.label + ' <small>' + service.entity.description + '</small>');
		$('#modalPlanName').text('Selected plan : ' + plan.entity.name);
		
		$('#modalOrganizations').html('<option value="">Organizations Loading...</option>');
		CF.async({url : '/v2/organizations'}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					$('#modalOrganizations').html('<option value="">Select a organization</option>');
					
					var orgList = result.resources;
					for(var i=0; i<orgList.length; i++)
					{
						$('#modalOrganizations').append('<option value="' + orgList[i].metadata.guid + '">' + orgList[i].entity.name + '</option>');
					}
					
					$('#modalOrganizations').removeAttr('disabled');
				}
				else
				{
					$('#modalMessage').text(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				$('#modalMessage').text('Unknown Error');	
			}
		},
		function(error)
		{
			$('#modalMessage').text(error);
		});
		
//		CF.async({url : '/v2/service_instances/' + serviceInstance.metadata.guid, method : 'PUT', headers : {'Content-Type' : 'application/x-www-form-urlencoded'}, form : {service_plan_guid : plan.metadata.guid}}, function(result)
//		{
//			$(successTarget).show().prev().remove();
//			if(result)
//			{
//				if(result.entity)
//				{
//					$('.bullets').find('.selected-plan').removeAttr('disabled', '').removeClass('btn-info').addClass('btn-primary').addClass('select-plan').removeClass('selected-plan');
//					$(successTarget).attr('disabled', '').removeClass('btn-primary').addClass('btn-info').addClass('selected-plan').removeClass('select-plan');;
//				}
//				else
//				{
//					$(errorTarget).text(result.description ? result.description : JSON.stringify(result.error));
//				}
//			}
//			else
//			{
//				$(errorTarget).text('Unknown Error');
//			}
//		},
//		function(error)
//		{
//			$(errorTarget).text(error);
//		});
	};
	
	var pumpkin = new Pumpkin();
	pumpkin.addWork('setServicePlan', function(params)
	{
		var next = this.next;
		var error = this.error;
		
		var target = params.target;
		var service = params.service;
		
		CF.async({url : service.entity.service_plans_url}, function(result)
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
								$('<span>$' + planList[i].entity.extra.costs[0].amount.usd + ' / ' + planList[i].entity.extra.costs[0].unit + '</span>').insertAfter(nameTh.find('.plan-name'));
							
							var bullets = planList[i].entity.extra.bullets;
							var html = '<ul>';
							for(var j=0; j<bullets.length; j++)
							{
								html += '<li>' + bullets[j] + '</li>';
							}
							
							html += '</ul>';
							
							td.append(html);
						}
						
						var div = $('<div style="text-align: center;"><button type="button" class="btn btn-primary select-plan">Select this plan</button><p class="message"></p></div></td>');
						div.get(0).item = planList[i];
						
						td.append(div);
						
						if(i != 0 && i%4 == 0)
						{
							$(target).append(th).append(tr);
							
							tr.find('.select-plan').on('click', function()
							{
								var plan = $(this).parent().get(0).item;
								selectPlan(service, plan);
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
							selectPlan(service, plan);
						});
						
						$(target).append(th).append(tr);
					}
					
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
		function(err)
		{
			error(err);
		});
	});
	
	$(document).ready(function()
	{
		CF.async({url : '/v2/services'}, function(result)
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
						
						if(service.entity.active)
						{
							var extra = service.entity.extra;
							var img = '';
							var name = service.entity.label;
							var longDescription = '';
							
							if(extra)
							{
								extra = JSON.parse(extra);
								service.entity.extra = extra;
								
								img = extra.imageUrl;
								name = extra.displayName;
								longDescription = extra.longDescription;
							}
							
							var description = service.entity.description;
							var html = $('#serviceRowTemplate').html();
							html = html.replace('{imageUrl}', img).replace('{name}', name).replace('{label}', description).replace('{description}', longDescription);
							
							var target = $(html);
							$('#serviceList').append(target);
							
							pumpkin.execute([{name : 'setServicePlan', params : {target : $(target).find('.plans-table tbody'), service : service}}], function()
							{
								target.find('.plans-progress').remove();
							},
							function(workName, error)
							{
								target.find('.plans-container').html('<p class="message">' + error + '</p>');
							});
							
							done();
						}
					},
					function()
					{
						$('.marketplace-progress').hide();
						
						$('#serviceList .view-plans').on('click', function()
						{
							var text = $(this).text();
							if(text == 'View plans')
								$(this).text('Hide plans').parent().parent().next().css('display', 'table');
							else
								$(this).text('View plans').parent().parent().next().hide();
						});
					});
				}
				else
				{
					$('#serviceList').html('<p class="message">' + (result.description ? result.description : JSON.stringify(result.error)) + '</p>');
				}
			}
			else
			{
				$('#serviceList').html('<p class="message">Unknown Error</p>');
			}
		},
		function(error)
		{
			$('#serviceList').html('<p class="message">' + error + '</p>');
		});
		
		$('#selectPlanDialog').modal('hide');
		
		$('#modalOrganizations').on('change', function()
		{
			$('#modalSpaces').html('<option value="">Spaces Loading...</option>');
			
			var orgGuid = $(this).val();
			CF.async({url : '/v2/organizations/' + orgGuid + '/spaces'}, function(result)
			{
				if(result)
				{
					if(result.resources)
					{
						$('#modalSpaces').html('<option value="">Select a space</option>');
						
						var spaceList = result.resources;
						for(var i=0; i<spaceList.length; i++)
						{
							$('#modalSpaces').append('<option value="' + spaceList[i].metadata.guid + '">' + spaceList[i].entity.name + '</option>');
						}
						
						$('#modalSpaces').removeAttr('disabled');
					}
					else
					{
						$('#modalMessage').text(result.description ? result.description : JSON.stringify(result.error));
					}
				}
				else
				{
					$('#modalMessage').text('Unknown Error');	
				}
			},
			function(error)
			{
				$('#modalMessage').text(error);
			});
		});
		
		$('#modalSpaces').on('change', function()
		{
			$('#modalApps').html('<option value="">Apps Loading...</option>');
			
			var spaceGuid = $(this).val();
			CF.async({url : '/v2/spaces/' + spaceGuid + '/apps'}, function(result)
			{
				if(result)
				{
					if(result.resources)
					{
						$('#modalApps').html('<option value="">Select a app to bind(optional)</option>');
						
						var appList = result.resources;
						for(var i=0; i<appList.length; i++)
						{
							$('#modalApps').append('<option value="' + appList[i].metadata.guid + '">' + appList[i].entity.name + '</option>');
						}
						
						$('#modalApps').removeAttr('disabled');
					}
					else
					{
						$('#modalMessage').text(result.description ? result.description : JSON.stringify(result.error));
					}
				}
				else
				{
					$('#modalMessage').text('Unknown Error');	
				}
			},
			function(error)
			{
				$('#modalMessage').text(error);
			});
		});
		
		formSubmit($('.modal-form'), function(data)
		{
			$('#modalMessage').text('');
			
			var plan = $('#selectPlanDialog').get(0).item;
			data.service_plan_guid = plan.metadata.guid;
			data.parameters = {};
			data.tags = plan.service.entity.tags;
			
			$('.modal-form .parameters').each(function()
			{
				var key = $(this).children('.key').val();
				var value = $(this).children('.value').val();
				
				if(key)
					data.parameters[key] = value;
			});
			
			$('.modal-form .small-progress').css('display', 'inline-block').next().next().hide().next().hide();
			
			CF.async({url : '/v2/service_instances?q=space_guid:' + data.space_guid, method : 'GET'}, function(result)
			{
				if(result)
				{
					if(result.resources)
					{
						var list = result.resources;
						console.log(list);
						for(var i=0; i<list.length; i++)
						{
							if(list[i].entity.name == data.name)
							{
								$('.modal-form .small-progress').hide().next().next().show().next().show();
								$('#modalMessage').text('The service instance name is taken: ' + data.name);
								return;
							}
						}
						
						CF.async({url : '/v2/service_instances', method : 'POST', form : data}, function(result)
						{
							if(result)
							{
								if(result.entity)
								{
									if(data.appGuid)
									{
										CF.async({url : '/v2/service_bindings', method : 'POST', form : {service_instance_guid : result.metadata.guid, app_guid : data.appGuid}}, function(result)
										{
											$('.modal-form .small-progress').hide().next().next().show().next().show();
											if(result)
											{
												if(result.entity)
												{
													$('#selectPlanDialog').modal('hide');
												}
												else
												{
													$('#modalMessage').text(result.description ? result.description : JSON.stringify(result.error));
												}
											}
											else
											{
												$('#modalMessage').text('Unknown Error by creation service binding.');
											}
										},
										function(error)
										{
											$('.modal-form .small-progress').hide().next().next().show().next().show();
											$('#modalMessage').text(error);
										});
									}
									else
									{
										$('#selectPlanDialog').modal('hide');
									}
								}
								else
								{
									if(result.description.indexOf('taken') != -1)
									{
										$('#modalMessage').text('');
										$('#selectPlanDialog').modal('hide');
										return;
									}
									
									$('.modal-form .small-progress').hide().next().next().show().next().show();
									$('#modalMessage').text(result.description ? result.description : JSON.stringify(result.error));
								}
							}
							else
							{
								$('.modal-form .small-progress').hide().next().next().show().next().show();
								$('#modalMessage').text('Unknown Error');
							}
						},
						function(error)
						{
							$('#modalMessage').text(error);
						});
					}
					else
					{
						$('.modal-form .small-progress').hide().next().next().show().next().show();
						$('#modalMessage').text(result.description ? result.description : JSON.stringify(result.error));
					}
				}
				else
				{
					$('.modal-form .small-progress').hide().next().next().show().next().show();
					$('#modalMessage').text('Unknown Error');
				}
			},
			function(error)
			{
				$('#modalMessage').text(error);
			});
		});
		
		$('#cancelModal').on('click', function()
		{
			var first = $('.parameters:first');
			$('.parameters').remove();
			
			$('.form-row:last').append(first);
			
			$('#selectPlanDialog').modal('hide');
			
			$('.modal-form input[type="text"]').val('');
			$('.modal-form select').html('');
			$('#modalMessage').text('');
		});
		
		var addParameter = function()
		{
			var clone = $(this).parent().clone().removeClass('.parameters');
			clone.find('input[type="text"]').val('');
			clone.insertAfter($(this).parent());
			
			$(this).removeClass('glyphicon-plus').addClass('glyphicon-minus');
			$(this).off('click').on('click', function()
			{
				$(this).parent().remove();
			});
			
			clone.find('.glyphicon').off('click').on('click', addParameter);
			clone.find('input:first').focus();
		};
		
		$('.modal-form .parameters .glyphicon').on('click', addParameter);
	});
})();