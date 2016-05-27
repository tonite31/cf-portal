(function()
{
	var REFRESH_TIME = 5; //second
	var timer = null;
	
	var getStatus = function(context, app, callback, error)
	{
		CF.async({url : '/v2/apps/' + app.metadata.guid + '/stats'}, function(result)
		{
			$(context).find('.appInstanceProgress').hide().next().show();
			if(result)
			{
				if(result.description)
				{
					$(context).find('.status-table tbody').html('');
					if(result.code == 200003)
					{
						$(context).find('.status-table tbody').append('<tr><td colspan="6" style="text-align: center;">There are no running instances of this app.</td></tr>');
						if(error)
							error('There are no running instances of this app.');
					}
					else
					{
						$(context).find('.status-table tbody').append('<tr><td colspan="6" style="text-align: center;">' + result.description + '</td></tr>');
						if(error)
							error(result.description);
					}
				}
				else
				{
					$(context).find('.status-table tbody').html('');
					for(var key in result)
					{
						var days = Math.floor(result[key].stats.uptime / 60 / 60 / 24);
						var remain = ((result[key].stats.uptime / 60 / 60 / 24) - days) * 24;
						var hours = Math.floor(remain);
						var min = Math.floor((remain - hours) * 60);
						
						var body = '';
						body += '<tr>';
						body += '<td>' + key + '</td>';
						body += '<td>' + result[key].state + '</td>';
						body += '<td>' + Math.round(result[key].stats.usage.cpu * 100) + '% </td>';
						body += '<td>' + Math.round(result[key].stats.usage.mem / 1024 / 1024) + ' MB</td>';
						body += '<td>' + Math.round(result[key].stats.usage.disk / 1024 / 1024) + ' MB</td>';
						body += '<td>' + (days > 0 ? days + 'd ' : '') + (hours > 0 ? hours + 'hr ' : '') + (min > 0 ? min + 'min' : '') + '</td>';
						body += '</tr>';
						
						$(context).find('.status-table tbody').append(body);
					}
					
					if(callback)
						callback();
				}
			}
			else
			{
				$(context).find('.status-table tbody').html('');
				if(error)
					error('There are no running instances of this app.');
				
				$(context).find('.status-table tbody').append('<tr><td colspan="6" style="text-align: center;">There are no running instances of this app.</td></tr>');
			}
		},
		function(err)
		{
			$(context).find('.status-table tbody').html('');
			if(error)
				error(err);
			$(context).find('.statusMessage').text(err.stack ? err.stack : err).show();
		});
	};
	
	_ee.on('app_detail_status', function(context, app)
	{
		$(context).find('.appInstanceProgress').show().next().hide();
		$(context).find('.statusMessage').hide();
		$(context).find('.small-progress').prev().text('');
		
		_IntervalTimer.addTimer('app_detail_status', REFRESH_TIME, function(start)
		{
			$(context).find('.small-progress').css('animation-name', 'progress').prev().text('');
			getStatus(context, app, function()
			{
				$(context).find('.small-progress').css('animation-name', 'none').prev().text('');
				start();
			},
			function(error)
			{
				$(context).find('.small-progress').css('animation-name', 'none').prev().text(error);
			});
		},
		function(count)
		{
			$(context).find('.small-progress').prev().text('00:0' + count);
		});
		
		getStatus(context, app, function()
		{
			_IntervalTimer.start('app_detail_status');
		});
		
		$(context).find('.small-progress').on('click', function()
		{
			var that = this;
			$(this).css('animation-name', 'progress').prev().text('Refreshing...');
			
			getStatus(context, app, function()
			{
				$(that).css('animation-name', 'none').prev().text('');
			},
			function(error)
			{
				$(that).css('animation-name', 'none').prev().text(error);
			});
		});
	});
})();