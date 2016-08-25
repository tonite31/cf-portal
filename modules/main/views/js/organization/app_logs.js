(function()
{
	var getLogs = function(app, callback, error)
	{
		CF.async({url : "/recent?app=" + app.metadata.guid, headers : {'Content-type' : 'text/plain; charset=utf-8'}}, function(result)
		{
			var split = result.split("\n");
			
			var logs = '';
			for(var i=0; i<split.length; i++)
			{
				if(split[i].match(/\[[0-9\/\:\.\s\+]*\]/gi))
				{
					split[i] = split[i].split('[')[1];
					logs += '<span class="logs-date">[' + split[i].replace(']', ']</span>') + '\n\n';
				}
			}
			
			callback(logs);
		}, error, true);
	};
	
	var socketId = null;
	_ee.on('taillog', function(data)
	{
		$('.logs-container pre').append('<p>' + data + '</p>');
	});
	
	_ee.once('app_detail_logs', function(context, app)
	{
		$(context).find('.logsProgress').show().next().hide();
		
		getLogs(app, function(logs)
		{
			$(context).find('.logsProgress').hide().next().show().find('pre').html(logs);
		},
		function(error)
		{
			$(context).find('.logsProgress').hide().next().hide().next().text(error).show();
		});
		
		$(context).find('.small-progress').on('click', function()
		{
			var that = this;
			$(this).css('animation-name', 'progress').prev().text('Refreshing...');
			getLogs(app, function(logs)
			{
				$(context).find('.logsProgress').hide().next().show().find('pre').html(logs);
				$(that).css('animation-name', 'none').prev().text('');
			},
			function(error)
			{
				$(that).css('animation-name', 'none').prev().text(error);
			});
		});
		
		$(context).find('#taillogChecker').on('click', function()
		{
			if(this.checked)
			{
				$('.logs-container pre').html('');
				$.ajax({url : '/cf_logs_tail', type : 'post', data : {url : '/tail/?app=' + app.metadata.guid, socketId : _global.socketId}}).done();
				$(context).find('.small-progress').hide();
			}
			else
			{
				$.ajax({url : '/cf_logs_tail_close', type : 'post', data : {socketId : _global.socketId}}).done();
				$(context).find('.small-progress').show();
			}
		});
	});
})();