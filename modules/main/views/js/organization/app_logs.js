(function()
{
	var getLogs = function(app, callback, error)
	{
		CF.async({url : "/recent?app=" + app.metadata.guid, headers : {'Content-type' : 'text/plain; charset=utf-8'}}, function(data)
		{
			try
			{
				data = data.split('\n\n');
		        if (data.length > 1) {
		            data.splice(0, 1);
		        }
		        var length = data.length;
		        for (var i = 0; i < length; i++) {
		            var value = data[i];
		            value = value.substr(1, value.length - 1);
		            var end = value.indexOf(String.fromCharCode(16));
		            data[i] = value.substr(0, end);
		        }
		        
		        data = data.join('\n');
		        
				callback(data);
			}
			catch(err)
			{
				console.error(err.stack);
			}
		}, error, true);
	};
	
	_ee.on('show_tail_log', function(params)
	{
		$('.logs-container pre').html('');
		$.ajax({url : '/cf_logs_tail', type : 'post', data : {url : '/tail/?app=' + params.appGuid, socketId : _global.socketId}}).done(function()
		{
			params.callback();
		});
		$('#logs').find('.small-progress').hide();
		$('#logs').find('#taillogChecker').get(0).checked = true;
	});
	
	_ee.on('app_detail_clicked', function(name)
	{
		if(name != 'logs')
		{
			if(_global.tailLogInterval)
			{
				clearInterval(_global.tailLogInterval);
				_global.tailLogInterval = null;
			}
			
			$.ajax({url : '/cf_logs_tail_close', type : 'post', data : {socketId : _global.socketId}}).done();
			$('#logs').find('.small-progress').show();
//			$('#logs').find('#taillogChecker').get(0).checked = false;
		}
	});
	
	_ee.on('hashchange', function()
	{
		if(_global.tailLogInterval)
		{
			clearInterval(_global.tailLogInterval);
			_global.tailLogInterval = null;
		}
	});
	
	_ee.once('app_detail_logs', function(context, app)
	{
		if(_global.tailLogInterval)
		{
			clearInterval(_global.tailLogInterval);
			_global.tailLogInterval = null;
		}
		
		$('#logs').find('.small-progress').show();
//		$('#logs').find('#taillogChecker').get(0).checked = false;
		
		$(context).find('#logs .logsProgress').show().next().hide();
		
		getLogs(app, function(logs)
		{
			$(context).find('#logs .logsProgress').hide().next().show().find('pre').html(logs);
		},
		function(error)
		{
			$(context).find('#logs .logsProgress').hide().next().hide().next().text(error).show();
		});
		
		$(context).find('#logs .small-progress').on('click', function()
		{
			var that = this;
			$(this).css('animation-name', 'progress').prev().text('Refreshing...');
			getLogs(app, function(logs)
			{
				$(context).find('#logs .logsProgress').hide().next().show().find('pre').html(logs);
				$(that).css('animation-name', 'none').prev().text('');
			},
			function(error)
			{
				$(that).css('animation-name', 'none').prev().text(error);
			});
		});
		
		$(context).find('#logs #taillogChecker').on('click', function()
		{
			if(this.checked)
			{
				if(_global.tailLogInterval)
				{
					clearInterval(_global.tailLogInterval);
					_global.tailLogInterval = null;
				}
				
				$('.logs-container pre').html('');
				$.ajax({url : '/cf_logs_tail', type : 'post', data : {url : '/tail/?app=' + app.metadata.guid}}).done(function(result)
				{
					_global.socketId = result;
					_global.tailLogInterval = setInterval(function()
					{
						$.ajax({url : '/get_cf_logs_tail?socketId=' + _global.socketId, type : 'get'}).done(function(result)
						{
							if(result)
							{
								if(result.length > 0)
								{
									for(var i=0; i<result.length; i++)
										$('.logs-container pre').append('<p>' + result[i] + '</p>');
									
									$('.logs-container pre').scrollTop($('.logs-container pre')[0].scrollHeight);
								}
							}
							else
							{
								if(_global.tailLogInterval)
								{
									clearInterval(_global.tailLogInterval);
									_global.tailLogInterval = null;
								}
							}
						});
					}, 5000);
				});
				$(context).find('#logs .small-progress').hide();
			}
			else
			{
				if(_global.tailLogInterval)
				{
					clearInterval(_global.tailLogInterval);
					_global.tailLogInterval = null;
				}
				
				$.ajax({url : '/cf_logs_tail_close', type : 'post', data : {socketId : _global.socketId}}).done();
				$(context).find('#logs .small-progress').show();
			}
		});
	});
})();