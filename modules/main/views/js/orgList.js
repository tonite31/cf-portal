var pumpkin = new Pumpkin();

pumpkin.addWork('getOrgList', function()
{
	$('.background-progress .progress-message').text('Organization is loading...');
	
	var that = this;
	CF.async({url : '/v2/organizations', method : 'get'}, function(result)
	{
		if(result)
		{
			var orgList = result.resources;
			if(orgList)
			{
				for(var i=0; i<orgList.length; i++)
				{
					var html = $('#orgItemTemplate').html();
					html = html.replace('{orgName}', orgList[i].entity.name);
					
					html = $(html);
					
					html.get(0).item = orgList[i];
					
					orgList[i].element = html;
					
					$('#orgList').append(html);
				}
				
				that.next(orgList);
			}
			else
			{
				that.error(result.message ? result.message : 'Organization is not found.');
			}
		}
		else
		{
			that.error('Organization is not found.');
		}
	});
});

pumpkin.addWork('getSpaceList', function(orgList)
{
	$('.background-progress .progress-message').text('Space is loading...');
	
	var template = '<li><a href="#" class="space-name">{name}</a></li>';
	var that = this;
	
	forEach(orgList, function(org, index)
	{
		var next = this.next;
		CF.async({url : org.entity.spaces_url}, function(result)
		{
			if(result)
			{
				var space = null;
				var spaceList = result.resources;
				if(spaceList)
				{
					for(var i=0; i<spaceList.length; i++)
					{
						space = $(template.replace('{name}', spaceList[i].entity.name).replace('#', '#space=' + spaceList[i].metadata.guid));
						$(space).attr('id', spaceList[i].metadata.guid);
						space.get(0).item = spaceList[i];
						$(org.element).children('ul').append(space);
					}
				}
				else
				{
					space = $(template.replace('{name}', result.message ? result.message : 'Empty').replace('href="#"', ''));
				}
				
				$(org.element).children('ul').append(space);
			}

			next(); // forEach next
		});
	}, function()
	{
		//forEach done
		that.next(); // pumpkin next
	});
});

$(document).ready(function()
{
	$('.background-progress').show();
	pumpkin.execute(['getOrgList', 'getSpaceList'], function()
	{
		$('.background-progress').hide();
		_ee.emit('orgList_done');
	}, function(workName, error)
	{
		common_warning(error);
	});
});