_ee.on('hashchange', function()
{
	//스페이스 클릭.
	if(_global.hash.space)
	{
		var space = $('#' + _global.hash.space).get(0);
		if(space)
		{
			
		}
	}
});

_ee.on('orgList_done', function()
{
	//여긴 최초 로딩. space가 있는 상태로 접속했거나 없는 상태로 접속했거나.
	console.log("최초 스펫 : ", _global.hash.space);
	
	if(_global.hash.space)
	{
		//_global.hash.space 이걸로 로딩
	}
	else
	{
		var space = $('#orgList li li').get(0);
	}
});

var setAppList = function(appsUrl)
{
	CF.async({url : appsUrl}, function(result)
	{
		if(result)
		{
			if(result.resources)
			{
				var appList = result.resources;
				if(appList.length == 0)
				{
					$('.org-container').html('<p class="alert alert-warning">Applications are not found.</p>');
				}
				else
				{
					for(var i=0; i<appList.length; i++)
					{
						
					}
				}
			}
			else
			{
				$('.org-container').html('<p class="alert alert-danger">' + result.message + '</p>');
			}
		}
		else
		{
			$('.org-container').html('<p class="alert alert-warning">Applications are not found.</p>');
		}
	});
};