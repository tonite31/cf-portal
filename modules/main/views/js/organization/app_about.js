(function()
{
	_ee.on('app_detail_about', function(context, app)
	{
		$(context).find('.aboutProgress').show().next().hide();
		
		$(context).find('.aboutProgress .progress-message').text('App information loading...');
		
		$(context).find('.buildpack').text(app.entity.buildpack ? app.entity.buildpack : app.entity.detected_buildpack);
		$(context).find('.cmd').text(app.entity.detected_start_command);
		
		CF.async({url : app.entity.stack_url}, function(stackResult)
		{
			if(stackResult && stackResult.entity)
			{
				$(context).find('.stack').text(stackResult.entity.name + "(" + stackResult.entity.description + ")");
				$(context).find('.aboutProgress').next().show();
			}
			else
			{
				$(context).find('.aboutMessage').text(stackResult.description).show();
			}
			
			$(context).find('.aboutProgress').hide();
			
		}, function(error)
		{
			$(context).find('.aboutProgress').hide();
			$(context).find('.aboutMessage').text(error).show();
		});
	});
})();