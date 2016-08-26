(function()
{
	var environment = null;
	
	var deleteButton = function(selector, callback)
	{
		$(selector).css('transition', 'opacity 0.2s');
		$(selector).on('click', function()
		{
			var that = this;
			
			this.timer = null;
			
			if(this.isConfirm)
			{
				this.isConfirm = false;
				if(callback)
				{
					$('<span class="glyphicon glyphicon-refresh small-progress" style="display: inline-block;"></span>').insertBefore(this);
					$(this).hide();
					callback.call(this, function()
					{
						$(that).prev().remove();
						$(that).show();
					});
				}
			}
			else
			{
				this.origin = $(this).text() ? $(this).text() : $(this).val();
				$(this).css('opacity', '0').removeClass('glyphicon').removeClass('glyphicon-remove');
				setTimeout(function()
				{
					that.isConfirm = true;
					$(that).css('opacity', '1').text('Confirm');
					
					setTimeout(function()
					{
						that.isConfirm = false;
						$(that).text('').addClass('glyphicon').addClass('glyphicon-remove');
					}, 3000);
				}, 300);
			}
		});
	};
	
	var setUserProvided = function(context, app)
	{
		$(context).find('#env .user-provided-container').html('');
		for(var key in environment)
		{
			var html = '<div class="panel panel-default user-provided" data-key="' + key + '">';
			html += '<div class="panel-heading">';
			html += '<span>[' + key + ']</span>';
			html += '<div class="confirm-button">';
			html += '<span class="glyphicon glyphicon-pencil edit"></span>';
			html += '<span class="glyphicon glyphicon-remove"></span><span class="confirm">confirm</span>';
			html += '<span class="user-provided-message"></span>'
			html += '</div>';
			html += '</div>';
			html += '<div class="panel-body">';
			html += environment[key];
			html += '</div>';
			html += '</div>';
			
			$(context).find('#env .user-provided-container').append(html);
		}
		
		$(context).find('#env .user-provided-container .user-provided').each(function()
		{
			var key = $(this).attr('data-key');
			
			$(this).find('.edit').on('click', function()
			{
				var mode = $(this).attr('data-mode');
				if(mode == 'edit')
				{
					environment[key] = $(this).parent().parent().next().find('textarea').val();
					
					$(this).removeAttr('data-mode');
					$(this).parent().parent().next().removeAttr('contenteditable');
					
					var that = $(this).next().next().next();
					
					$(this).hide().next().css('display', 'inline-block').next().hide();
					
					var param = {};
					param.url = '/v2/apps/' + app.metadata.guid;
					param.method = 'PUT';
					param.headers = {'Content-Type' : 'application/json'};
					param.form = {};
					param.form['environment_json'] = environment;
					
					CF.async(param, function(result)
					{
						if(result)
						{
							if(result.entity)
							{
								environment = result.entity.environment_json;
								setUserProvided(context, app);
							}
							else
							{
								$(that).hide().prev().show().prev().hide().prev().show();
								$(that).next().text(result.description ? result.description : JSON.stringify(result.error));
							}
						}
						else
						{
							$(that).hide().prev().show().prev().hide().prev().show();
							$(that).next().text('Unkown error');
						}
					},
					function(error)
					{
						$(that).hide().prev().show().prev().hide().prev().show();
						$(that).next().text(error);
					});
				}
				else
				{
					$(this).attr('data-mode', 'edit');
					var text = $(this).parent().parent().next().text();
					$(this).parent().parent().next().html('<textarea style="width: 100%;">' + text + '</textarea>');
					$(this).parent().parent().next().find('textarea').focus();
					$(this).removeClass('glyphicon-pencil').addClass('glyphicon glyphicon-save');
				}
			});
			
			deleteButton($(this).find('.glyphicon-remove'), function(done)
			{
				var that = this;
//				$(this).hide().prev().hide().prev().css('display', 'inline-block').prev().hide();
				delete environment[key];

				var param = {};
				param.url = '/v2/apps/' + app.metadata.guid;
				param.method = 'PUT';
				param.headers = {'Content-Type' : 'application/x-www-form-urlencoded'};
				param.form = {};
				param.form['environment_json'] = environment;
				
				CF.async(param, function(result)
				{
					environment = result.entity.environment_json;
					if(result)
					{
						if(result.entity)
						{
							setUserProvided(context, app);
						}
						else
						{
//							$(that).hide().prev().show().prev().hide().prev().show();
							$(that).next().text(result.description ? result.description : JSON.stringify(result.error));
						}
					}
					else
					{
//						$(that).hide().prev().show().prev().hide().prev().show();
						$(that).next().text('Unkown error');
					}
				},
				function(error)
				{
//					$(that).hide().prev().show().prev().hide().prev().show();
					$(that).next().text(error);
				});
			});
		});
	};
	
	_ee.once('app_detail_env', function(context, app)
	{
		$(context).find('#env .envProgress').show().next().hide();
		
		environment = app.entity.environment_json;
		setUserProvided(context, app, environment);
		
		CF.async({url : '/v2/apps/' + app.metadata.guid + '/env'}, function(result)
		{
			if(result)
			{
				$(context).find('#env .envProgress').hide().next().show();
				$(context).find('#env .system-provided').html(JSON.stringify(result, null, 4));
			}
			else
			{
				$(context).find('#env .envProgress').hide();
				$(context).find('#env .envMessage').text('Environment Variables is not found.').show();
			}
		},
		function(error)
		{
			$(context).find('#env .envProgress').hide();
			$(context).find('#env .envMessage').text(error).show();
		});
		
		formSubmit($(context).find('#env .env-form'), function(data)
		{
			$(context).find('#env .env-form .env-progress').css('display', 'inline-block').next().hide().next().hide();
			
			if(environment.hasOwnProperty(data.key))
			{
				$(context).find('#env .env-form .env-progress').hide().next().show().next().show();
				$(context).find('#env .env-service-message').text('Duplicated key');
				return;
			}
			
			environment[data.key] = data.value;
			
			var param = {};
			param.url = '/v2/apps/' + app.metadata.guid;
			param.method = 'PUT';
			param.headers = {'Content-Type' : 'application/json'};
			param.form = {};
			param.form['environment_json'] = environment;
			
			CF.async(param, function(result)
			{
				$(context).find('#env .env-form .env-progress').hide().next().show().next().show();
				
				$(context).find('#env .env-form input[name="key"]').val('').parent().next().children('textarea').val('');
				
				if(result)
				{
					if(result.entity)
					{
						setUserProvided(context, app, result.entity.environment_json);
					}
					else
					{
						$(context).find('#env .env-service-message').text(result.description ? result.description : JSON.stringify(result.error));
					}
				}
				else
				{
					$(context).find('#env .env-service-message').text('Unkown error');
				}
			},
			function(error)
			{
				$(context).find('#env .env-form .env-progress').hide().next().show().next().show();
				$(context).find('#env .env-service-message').text(error);
			});
		});
		
		$(context).find('#env .env-cancel').on('click', function()
		{
			$(context).find('#env .env-form input[name]').val('');
			$(context).find('#env .env-form textarea').val('');
		});
	});
})();