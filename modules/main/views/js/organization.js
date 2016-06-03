(function()
{
	$(document).ready(function()
	{
		$('#createSpaceDialog').modal('hide');
		
		$('#createSpace').on('click', function()
		{
			$('#createSpaceOrganization').html('<option value="">Organizations Loading...</option>');
			$('#createSpaceDialog .modal-form input[type="text"]').val();
			
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
			CF.async({url : '/v2/spaces', method : 'POST', form : data}, function(result)
			{
				$('#createSpaceMessage').prev().hide().next().next().show().next().show();
				if(result)
				{
					if(result.entity)
					{
						var space = $('<li id=' + result.metadata.guid + '><a href="#space=' + result.metadata.guid + '" class="space-name">' + result.entity.name + '</a></li>');
						space.get(0).item = result;
						$('#' + data.organization_guid).append(space);
						
						$('#createSpaceDialog').modal('hide');
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
		
		$('#cancelCreateSpaceModal').on('click', function()
		{
			$('#createSpaceDialog').modal('hide');
		});
	});
})();