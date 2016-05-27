(function()
{
	_ee.on('app_detail_status', function(context, app)
	{
		$(context).find('.appInstanceProgress').parent().parent().show();
		$(context).find('.statusMessage').hide();
		
		var progressTr = $(context).find('.status-table tbody tr:first');
		$(context).find('.status-table tbody tr').remove();
		$(context).find('.status-table tbody').append(progressTr);
		
		CF.async({url : '/v2/apps/' + app.metadata.guid + '/stats'}, function(result)
		{
			$(context).find('.appInstanceProgress').parent().parent().hide();
			if(result)
			{
				if(result.description)
				{
					if(result.code == 200003)
					{
						$(context).find('.status-table tbody').append('<tr><td colspan="6" style="text-align: center;">There are no running instances of this app.</td></tr>');
					}
					else
					{
						$(context).find('.statusMessage').text(result.description).show();
					}
				}
				else
				{
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
				}
			}
			else
			{
				$(context).find('.statusMessage').text('App status is not found.').show();
			}
		},
		function(error)
		{
			$(context).find('.statusMessage').text(error.stack ? error.stack : error).show();
		});
	});
})();