(function()
{
	var pumpkin = new Pumpkin();
	pumpkin.addWork('createSpace', function(params)
	{
		var next = this.next;
		CF.async({url : '/v2/spaces', method : 'POST', form : params.data}, function(result)
		{
			if(result)
			{
				if(result.entity)
				{
					$('#createSpaceMessage').prev().hide().next().next().show().next().show();
					
					var el = $('<li id=' + result.metadata.guid + '><a href="#space=' + result.metadata.guid + '" class="space-name">' + result.entity.name + '</a></li>');
					el.get(0).item = result;
					el.get(0).item.organization = $('#' + params.data.organization_guid).parent().get(0).item;
					$('#' + params.data.organization_guid).append(el);
					
					$('#createSpaceDialog').modal('hide');
					
					next(result);
				}
				else
				{
					$('#createSpaceMessage').text(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				$('#createSpaceMessage').text('Unknown Error');
			}
		},
		function(error)
		{
			$('#createSpaceMessage').text(error);
		});
	});
	
	pumpkin.addWork('setSpaceManager', function(space)
	{
		var next = this.next;
		next(space);
		CF.async({url : '/v2/spaces/' + space.metadata.guid + '/managers', method : 'PUT', form : {username : $('#username').attr('data-username')}}, function(result)
		{
			if(result)
			{
				if(result.entity)
				{
				}
				else
				{
					$('#createSpaceMessage').text(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				$('#createSpaceMessage').text('Unknown Error');
			}
		},
		function(error)
		{
			$('#createSpaceMessage').text(error);
		});
	});
	
	pumpkin.addWork('setSpaceDeveloper', function(space)
	{
		var next = this.next;
		CF.async({url : '/v2/spaces/' + space.metadata.guid + '/developers', method : 'PUT', form : {username : $('#username').attr('data-username')}}, function(result)
		{
			if(result)
			{
				if(result.entity)
				{
					next(space);
				}
				else
				{
					$('#createSpaceMessage').text(result.description ? result.description : JSON.stringify(result.error));
				}
			}
			else
			{
				$('#createSpaceMessage').text('Unknown Error');
			}
		},
		function(error)
		{
			$('#createSpaceMessage').text(error);
		});
	});
	
	$(document).ready(function()
	{
		$('#createSpaceDialog').modal('hide');
		
		$('#createSpace').on('click', function()
		{
			$('#createSpaceOrganization').html('<option value="">Organizations Loading...</option>');
			$('#createSpaceDialog .modal-form input[type="text"]').val('');
			
			var html = '<option value="">Select a organization to create space</option>';
			$('#orgList > li').each(function()
			{
				var org = this.item;
				html += '<option value="' + org.metadata.guid + '">' + org.entity.name + '</option>';
			});
			
			$('#createSpaceOrganization').html(html);
			
			$('#createSpaceDialog').modal('show');
		});
		
		formSubmit('#createSpaceDialog .modal-form', function(data)
		{
			$('#createSpaceMessage').prev().css('display', 'inline-block').next().next().hide().next().hide();
			
			pumpkin.execute([{name : 'createSpace', params : {data : data}}, 'setSpaceManager', 'setSpaceDeveloper'], function(space)
			{
				
			});
		});
		
		$('#cancelCreateSpaceModal').on('click', function()
		{
			$('#createSpaceDialog').modal('hide');
		});
	});
})();