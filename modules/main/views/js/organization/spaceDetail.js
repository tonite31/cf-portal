(function()
{
	var SPACE_NAME_UPDATE_TIME = 3;
	
	_ee.on('space_selected', function(space)
	{
		$('#spaceName span:first').text(space.entity.name);
		$('#startedAppCount').text('Loading...');
		$('#stoppedAppCount').text('Loading...');
		$('#downAppCount').text('Loading...');
	});
	
	_ee.on('setAppList_done', function(appList)
	{
		var started = 0;
		var stopped = 0;
		var down = 0;
		
		for(var i=0; i<appList.length; i++)
		{
			if(appList[i].entity.state == 'STARTED')
				started++;
			else if(appList[i].entity.state == 'STOPPED')
				stopped++;
			else
				down++;
		}
		
		$('#startedAppCount').text(started + ' Started');
		$('#stoppedAppCount').text(stopped + ' Stopped');
		$('#downAppCount').text(down + ' Down');
	});
	
	$(document).ready(function()
	{
		$('#spaceName span').on('click', function()
		{
			var prev = $(this).text();
			$(this).attr('contenteditable', '').focus();
			
			$(this).on('blur', function()
			{
				if(prev != $(this).text())
				{
					//업데이트
					var space = $('#' + _global.hash.space).get(0).item;
					
					$('#spaceName').next().text('Please, wait for update.').css('color', '#337ab7');
					CF.async({url : '/v2/spaces/' + space.metadata.guid, method : 'PUT', form : {name : $(this).text()}}, function(result)
					{
						if(result)
						{
							if(result.entity)
							{
								$('#spaceName').next().text('Updated.').css('color', '#337ab7');
								setTimeout(function()
								{
									$('#spaceName').next().text('');
								}, 1000 * SPACE_NAME_UPDATE_TIME);
							}
							else
							{
								$('#spaceName span:first').text(prev);
								$('#spaceName').next().text(result.description).css('color', '');
							}
						}
						else
						{
							$('#spaceName span:first').text(prev);
							$('#spaceName').next().text('Unknown error.').css('color', '');
						}
					},
					function(error)
					{
						$('#spaceName span:first').text(prev);
						$('#spaceName').next().text(error.stack ? error.stack : error).css('color', '');
					});
				}
				
				$(this).removeAttr('contenteditable').off('blur').off('keyup');
			});
			
			$(this).on('keydown', function(e)
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
	});
})();