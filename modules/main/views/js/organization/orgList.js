(function()
{
	var pumpkin = new Pumpkin();
	pumpkin.addWork('getOrgList', function()
	{
		$('#backgroundProgress .progress-message').text('Organizations loading...');
		
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
						html = html.replace('{orgName}', orgList[i].entity.name).replace('{guid}', orgList[i].metadata.guid);
						
						html = $(html);
						
						html.get(0).item = orgList[i];
						
						orgList[i].element = html;
						
						$('#orgList').append(html);
					}
					
					that.next(orgList);
				}
				else
				{
					that.error(result.description ? result.description : 'Organization is not found.');
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
		$('#backgroundProgress .progress-message').text('Spaces loading...');
		
		var template = '<li><a href="#" class="space-name">{name}</a></li>';
		var that = this;
		
		var forEach = new ForEach();
		forEach.sync(orgList, function(org, index)
		{
			var done = this.done;
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
							
							if(spaceList[i].metadata.guid == _global.hash.space)
								$(space).children('a').addClass('selected');
							
							spaceList[i].organization = org;
							space.get(0).item = spaceList[i];
							
							$(org.element).children('ul').append(space);
						}
					}
					else
					{
						space = $(template.replace('{name}', result.description ? result.description : 'Empty').replace('href="#"', ''));
					}
					
					$(org.element).children('ul').append(space);
				}

				done(); // forEach next
			});
		}, function()
		{
			//forEach done
			that.next(); // pumpkin next
		});
	});
	
	_ee.on('hashchange', function()
	{
		if(_global.hash.space)
		{
			$('#orgList li[id] a.selected').removeClass('selected');
			$('#' + _global.hash.space).children('a').addClass('selected');
		}
	});

	$(document).ready(function()
	{
		$('#backgroundProgress').show();
		pumpkin.execute(['getOrgList', 'getSpaceList'], function()
		{
			if($('#orgList ul > li:first').length == 0)
				$('.org-container').html('<div class="alert alert-warning">no spaces.</div>');
			
			$('#backgroundProgress').hide();
			_ee.emit('orgList_done');
		}, function(workName, error)
		{
			console.error(error.stack ? error.stack : error);
		});
	});
})();