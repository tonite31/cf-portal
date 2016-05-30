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
					
					next({url : orgList[0].entity.domains_url});
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
		});
	});
	
	pumpkin.addWork('getDomains', function(params)
	{
		var next = this.next;
		var progress = $('#domainsBody tr:first').show();
		$('#domainsBody').html('').append(progress);
		CF.async({url : params.url}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					var domainList = result.resources;
					for(var i=0; i<domainList.length; i++)
					{
						var row = $('#domainRowTemplate').html();
						row = row.replace('{domain}', domainList[i].entity.name);
						
						row = $(row).hide();
						row.get(0).item = domainList[i];
						$('#domainsBody').append(row);
					}
					
					$('#domainsBody tr').show();
					$('#domainsBody tr:first').hide();
					
					next();
				}
				else
				{
					var row = $('.progress-row').hide();
					$('#domainsBody').html('<tr><td colspan="2" style="text-align: center;">' + result.description ? result.description : JSON.stringify(result.error) + '</td></tr>').preped(row);
				}
			}
			else
			{
				var row = $('.progress-row').hide();
				$('#domainsBody').html('<tr><td colspan="2" style="text-align: center;">Unknown Error</td></tr>').preped(row);
			}
		});
	});
	
	var setDeleteDomain = function(target, guid)
	{
		confirmButton(target, function(done)
		{
			CF.async({url : '/v2/domains/' + guid, method: 'DELETE'}, function(result)
			{
				if(result && result.code)
				{
					$(target).hide().next().text(result.description ? result.description : JSON.stringify(result.error));
				}
				else
				{
					$(target).parent().parent().remove();
				}
			},
			function(error)
			{
				$(target).hide().next().text(error);
			});
		});
	};
	
	$(document).ready(function()
	{
		pumpkin.execute(['getOrgs', 'getDomains'], function()
		{
			$('#domainsBody tr .delete').each(function()
			{
				var that = this;
				var domain = $(this).parent().parent().get(0).item;
				setDeleteDomain(this, domain.metadata.guid);
			});
		});
		
		formSubmit($('#domainsForm'), function(data)
		{
			$('#message').text('');
			$('.small-progress').css('display', 'inline-block').next().hide().next().hide();
			CF.async({url : '/v2/domains', method : 'POST', form : data}, function(result)
			{
				$('.small-progress').hide().next().show().next().show();
				if(result)
				{
					if(result.entity)
					{
						$('#domainName').val('');
						var row = $('#domainRowTemplate').html();
						row = row.replace('{domain}', result.entity.name);
						
						row = $(row);
						row.get(0).item = result;
						$('#domainsBody').append(row);
						
						setDeleteDomain(row.find('.delete'), result.metadata.guid);
					}
					else
					{
						$('#message').text(result.description ? result.description : JSON.stringify(result.error));
					}
				}
				else
				{
					$('#message').text('Unknown Error.');
				}
			},
			function(error)
			{
				$('#message').text(error);
			});
		});
		
		$('#cancel').on('click', function()
		{
			$('#domainName').val('');
		});
		
		$('#orgSelect').on('change', function()
		{
			pumpkin.execute([{name : 'getDomains', params : {url : '/v2/organizations/' + $(this).val() + '/domains'}}], function()
			{
				$('#domainsBody tr .delete').each(function()
				{
					var that = this;
					var domain = $(this).parent().parent().get(0).item;
					setDeleteDomain(this, domain.metadata.guid);
				});
			});
		});
	});
})();