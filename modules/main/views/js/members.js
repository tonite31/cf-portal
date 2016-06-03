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
					var html = '<option value="">Select a space</option>';
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
	
	var pumpkinForList = new Pumpkin();
	pumpkinForList.addWork('getUsers', function(params)
	{
		var uuid = new Date().getTime();
		$('#' + params.tableName).attr('data-uuid', uuid);
		
		var progress = $('#' + params.tableName + ' tbody tr:first').show();
		$('#' + params.tableName + ' tbody').html('').append(progress);
		
		var next = this.next;
		var error = this.error;
		
		getUsersByType(params, 'auditors');
		
//		console.log(params.guid);
//		CF.async({url : '/v2/' + params.dataName + '/' + params.guid + '/users'}, function(result)
//		{
//			console.log("여기는 : ", result);
//			if($('#' + params.tableName).attr('data-uuid') != uuid)
//			{
//				return;
//			}
//			
//			params.uuid = uuid;
//			
//			if(result)
//			{
//				if(result.resources)
//				{
//					var userList = result.resources;
//					for(var i=0; i<userList.length; i++)
//					{
//						var template = $('#userRowTemplate').html();
//						template = template.replace('{guid}', userList[i].metadata.guid).replace('{username}', userList[i].entity.username);
//						
//						var row = $(template).hide();
//						row.get(0).item = userList[i];
//						
//						$('#' + params.tableName + ' tbody').append(row);
//					}
//					
//					$('#' + params.tableName + ' tbody tr input[type="checkbox"]').on('change', function()
//					{
//						var userGuid = $(this).parent().parent().get(0).item.metadata.guid;
//						params.userGuid = userGuid;
//						
//						if(this.checked == true)
//							params.method = 'PUT';
//						else
//							params.method = 'DELETE';
//						
//						var type = $(this).attr('class');
//						if(type == 'managers')
//						{
//							params.type = 'managers';
//						}
//						else if(type == 'auditors')
//						{
//							params.type = 'auditors';
//						}
//						else
//						{
//							if(params.dataName == 'spaces')
//								params.type = 'developers';
//							else
//								params.type = 'billing_managers';
//						}
//						
//						var progress = '<span class="glyphicon glyphicon-refresh small-progress" style="display: inline-block;"></span>';
//						$(this).hide();
//						$(progress).insertBefore(this);
//						
//						var that = this;
//						updateMemberAssociation.execute([{name : 'update', params : params}], function()
//						{
//							$(that).show().prev().remove();
//						},
//						function(workName, error)
//						{
//							$(that).prev().remove();
//							$('<span style="color: red;">' + error + '</span>').insertBefore(that);
//						});
//					});
//					
//					next(params);
//				}
//				else
//				{
//					progress.hide();
//					$('#' + params.tableName + ' tbody').append('<tr><td class="error" colspan="5" style="text-align: center;">' + (result.description ? result.description : JSON.stringify(result.error)) + '</td></tr>');
//					error();
//				}
//			}
//			else
//			{
//				progress.hide();
//				$('#' + params.tableName + ' tbody').append('<tr><td class="error" colspan="5" style="text-align: center;">Unknown Error.</td></tr>');
//				error();
//			}
//		},
//		function(error)
//		{
//			progress.hide();
//			$('#' + params.tableName + ' tbody').append('<tr><td class="error" colspan="5" style="text-align: center;">' + error + '</td></tr>');
//			error();
//		});
	});
	
	pumpkinForList.addWork('getUsersForCheck', function(params)
	{
		var progress = $('#' + params.tableName + ' tbody tr:first');
		
		$('#' + params.tableName + ' tbody').html('').append(progress);
		
		var next = this.next;
		var error = this.error;
		
		CF.async({url : '/v2/' + params.dataName + '/' + params.guid + '/' + params.type}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					var userList = result.resources;
					for(var i=0; i<userList.length; i++)
					{
						var template = $('#userRowTemplate').html();
						template = template.replace('{guid}', userList[i].metadata.guid).replace('{username}', userList[i].entity.username);
						
						var row = $(template).hide();
						row.get(0).item = userList[i];
						
						$('#' + params.tableName + ' tbody').append(row);
						
						var input = $(row).find('.' + this.type).get(0);
						if(input)
							input.checked = true;
					}
					
					$('#' + params.tableName + ' tbody tr input[type="checkbox"]').on('change', function()
					{
						var userGuid = $(this).parent().parent().get(0).item.metadata.guid;
						params.userGuid = userGuid;
						
						if(this.checked == true)
							params.method = 'PUT';
						else
							params.method = 'DELETE';
						
						var type = $(this).attr('class');
						if(type == 'managers')
						{
							params.type = 'managers';
						}
						else if(type == 'auditors')
						{
							params.type = 'auditors';
						}
						else
						{
							if(params.dataName == 'spaces')
								params.type = 'developers';
							else
								params.type = 'billing_managers';
						}
						
						var progress = '<span class="glyphicon glyphicon-refresh small-progress" style="display: inline-block;"></span>';
						$(this).hide();
						$(progress).insertBefore(this);
						
						var that = this;
						updateMemberAssociation.execute([{name : 'update', params : params}], function()
						{
							$(that).show().prev().remove();
						},
						function(workName, error)
						{
							$(that).prev().remove();
							$('<span style="color: red;">' + error + '</span>').insertBefore(that);
						});
					});
					
					next();
				}
				else
				{
					progress.hide();
					$('#' + params.tableName + ' tbody').append('<tr><td class="error" colspan="5" style="text-align: center;">' + (result.description ? result.description : JSON.stringify(result.error)) + '</td></tr>');
					error();
				}
			}
			else
			{
				progress.hide();
				$('#' + params.tableName + ' tbody').append('<tr><td class="error" colspan="5" style="text-align: center;">Unknown Error.</td></tr>');
				error();
			}
		}.bind({type : params.type}),
		function(error)
		{
			progress.hide();
			$('#' + params.tableName + ' tbody').append('<tr><td class="error" colspan="5" style="text-align: center;">' + error + '</td></tr>');
			error();
		});
	});
	
	var updateMemberAssociation = new Pumpkin();
	updateMemberAssociation.addWork('update', function(params)
	{
		var next = this.next;
		var error = this.error;
		
		CF.async({url : '/v2/' + params.dataName + '/' + params.guid + '/' + params.type + '/' + params.userGuid, method : params.method}, function(result)
		{
			if(result)
			{
				if(result.code)
				{
					error(result);
				}
				else
				{
					next();
				}
			}
			else
			{
				if(params.method == 'PUT')
					error('Unknown Error');
				else
					next();
			}
		},
		function(error)
		{
			error(error);
		});
	});
	
	var loadOrganizationMembers = function(guid)
	{
		var workList = [{name : 'getUsersForCheck', params : {guid : guid, tableName : 'orgTable', dataName : 'organizations', type : 'managers'}},
                        {name : 'getUsersForCheck', params : {guid : guid, tableName : 'orgTable', dataName : 'organizations', type : 'billing_managers'}},
                        {name : 'getUsersForCheck', params : {guid : guid, tableName : 'orgTable', dataName : 'organizations', type : 'auditors'}}];
		
		pumpkinForList.executeAsync(workList, function()
		{
			$('#orgTable tbody tr').show();
			$('#orgTable tbody tr:first').hide();
			
			$('#orgTable tbody .glyphicon-remove').each(function()
			{
				var tr = $(this).parent().parent();
				var user = tr.get(0).item;
				confirmSpan(this, function(done)
				{
					//여기서 모든 스페이스의 association을 다 제거 해주는건? - 추후 개발하는걸로.
					CF.async({url : '/v2/organizations/' + guid + '/users/' + user.metadata.guid, method : 'DELETE'}, function(result)
					{
						if(result)
						{
							if(result.code)
							{
								var errorTr = $('<tr><td colspan="5" class="error" style="text-align: right;">' + (result.description ? result.description : JSON.stringify(result.error)) + ' <span class="glyphicon glyphicon-remove"></span></td></tr>').insertAfter(tr);
								errorTr.find('.glyphicon').on('click', function()
								{
									$(this).parent().parent().remove();
								});
							}
						}
						else
						{
							tr.remove();
						}
						
						done();
					},
					function(error)
					{
						var errorTr = $('<tr><td colspan="5" class="error" style="text-align: right;">' + error + ' <span class="glyphicon glyphicon-remove"></span></td></tr>').insertAfter(tr);
						errorTr.find('.glyphicon').on('click', function()
						{
							$(this).parent().parent().remove();
						});
						
						done();
					});
				});
			});
		});
	};
	
	var loadSpaceMembers = function(guid)
	{
		var workList = [{name : 'getUsersForCheck', params : {guid : guid, tableName : 'spaceTable', dataName : 'spaces', type : 'managers'}},
                        {name : 'getUsersForCheck', params : {guid : guid, tableName : 'spaceTable', dataName : 'spaces', type : 'developers'}},
                        {name : 'getUsersForCheck', params : {guid : guid, tableName : 'spaceTable', dataName : 'spaces', type : 'auditors'}}];
		
		pumpkinForList.executeAsync(workList, function()
		{
			$('#spaceTable tbody tr').show();
			$('#spaceTable tbody tr:first').hide();
			
			$('#spaceTable tbody .glyphicon-remove').each(function()
			{
				var tr = $(this).parent().parent();
				var user = tr.get(0).item;
				confirmSpan(this, function(done)
				{
					var guid = $('#spaceSelect option:selected').val();
					var workList = [];
					workList.push({name : 'update', params : {tableName : 'spaceTable', dataName : 'spaces', type : 'auditors', guid : guid, userGuid : user.metadata.guid, method : 'DELETE'}});
					workList.push({name : 'update', params : {tableName : 'spaceTable', dataName : 'spaces', type : 'managers', guid : guid, userGuid : user.metadata.guid, method : 'DELETE'}});
					workList.push({name : 'update', params : {tableName : 'spaceTable', dataName : 'spaces', type : 'developers', guid : guid, userGuid : user.metadata.guid, method : 'DELETE'}});
					updateMemberAssociation.execute(workList, function()
					{
						tr.remove();
						done();
					},
					function(workName, error)
					{
						var errorTr = $('<tr><td colspan="5" class="error" style="text-align: right;">' + error + ' <span class="glyphicon glyphicon-remove"></span></td></tr>').insertAfter(tr);
						errorTr.find('.glyphicon').on('click', function()
						{
							$(this).parent().parent().remove();
						});
					});
				});
			});
		});
	};
	
	$(document).ready(function()
	{
		pumpkin.execute(['getOrgs', 'getSpaces'], function()
		{
			var guid = $('#orgSelect option:selected').val();
			loadOrganizationMembers(guid);
		});
		
		$('#orgSelect').on('change', function()
		{
			$('#spaceTable').hide();
			$('#orgTable').show();
			
			var guid = $(this).val();
			loadOrganizationMembers(guid);
			
			$('#spaceSelect').html('<option value="">Spaces Loading...</option>').attr('disabled', '');
			pumpkin.execute([{name : 'getSpaces', params: {guid : guid}}], function()
			{
				$('#spaceSelect').removeAttr('disabled');
			});
		});
		
		$('#spaceSelect').on('change', function()
		{
			if($(this).val() == '')
			{
				if(this.init)
					return;
				
				this.init = true;
				$('#spaceTable').hide();
				$('#orgTable').show();
				
				var guid = $('#orgSelect').val();
				loadOrganizationMembers(guid);
				
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
				$('#orgTable').hide();
				$('#spaceTable').show();
				
				var guid = $(this).val();
				loadSpaceMembers(guid);
			}
		});
		
		formSubmit($('#membersForm'), function(data)
		{
			$('.small-progress').css('display', 'inline-block').next().hide().next().hide();
			CF.users('invite', {target : data.emails, orgId : data.org}, function(result)
			{
				$('.small-progress').hide().next().show().next().show();
				if(result)
				{
					if(result.code)
					{
						$('#message').text(result.description ? result.description : JSON.stringify(result.error));
					}
					else
					{
						$('#emails').val('');
						
						var forEach = new ForEach();
						forEach.async(result, function(user, index)
						{
							if($('td:contains(' + user.entity.username + ')').length > 0)
								return;
								
							var params = {dataName : 'organizations', guid : data.org, type : 'auditors', userGuid : user.metadata.guid, method : 'PUT'};
							updateMemberAssociation.execute([{name : 'update', params : params}], function()
							{
								var template = $('#userRowTemplate').html();
								template = template.replace('{guid}', user.metadata.guid).replace('{username}', user.entity.username);
								
								var row = $(template);
								row.get(0).item = user;
								
								$('#orgTable tbody').append(row);
								$('#orgTable tbody tr:last input[type="checkbox"]').on('change', function()
								{
									var userGuid = $(this).parent().parent().get(0).item.metadata.guid;
									params.userGuid = userGuid;
									
									if(this.checked == true)
										params.method = 'PUT';
									else
										params.method = 'DELETE';
									
									var type = $(this).attr('class');
									if(type == 'managers')
									{
										params.type = 'managers';
									}
									else if(type == 'auditors')
									{
										params.type = 'auditors';
									}
									else
									{
										if(params.dataName == 'spaces')
											params.type = 'developers';
										else
											params.type = 'billing_managers';
									}
									
									var progress = '<span class="glyphicon glyphicon-refresh small-progress" style="display: inline-block;"></span>';
									$(this).hide();
									$(progress).insertBefore(this);
									
									var that = this;
									updateMemberAssociation.execute([{name : 'update', params : params}], function()
									{
										$(that).show().prev().remove();
									},
									function(workName, error)
									{
										$(that).prev().remove();
										$('<span style="color: red;">' + error + '</span>').insertBefore(that);
									});
								});
							},
							function(workName, error)
							{
								console.error(error.stack);
								$('#message').text(error);
							});
						});
					}
				}
				else
				{
					$('#message').text('Unknown Error');
				}
				
				$('#email').val('');
			},
			function(error)
			{
				$('#message').text(error);
			});
		});
	});
})();