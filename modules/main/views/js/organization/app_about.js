(function()
{
	_ee.once('app_detail_about', function(context, app)
	{
		$(context).find('#about .aboutProgress').show().next().hide();
		
		$(context).find('#about .aboutProgress .progress-message').text('App information loading...');
		
		$(context).find('#about .buildpack').text(app.entity.buildpack ? app.entity.buildpack : app.entity.detected_buildpack);
		$(context).find('#about .cmd').text(app.entity.detected_start_command);
		
		CF.async({url : app.entity.stack_url}, function(stackResult)
		{
			if(stackResult && stackResult.entity)
			{
				$(context).find('#about .stack').text(stackResult.entity.name + "(" + stackResult.entity.description + ")");
				$(context).find('#about .aboutProgress').next().show();
			}
			else
			{
				$(context).find('#about .aboutMessage').text(stackResult.description ? stackResult.description : JSON.stringify(stackResult.error)).show();
			}
			
			$(context).find('#about .aboutProgress').hide();
			
		}, function(error)
		{
			$(context).find('#about .aboutProgress').hide();
			$(context).find('#about .aboutMessage').text(error).show();
		});
	});
})();