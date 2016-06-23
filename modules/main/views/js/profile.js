(function()
{
	$(document).ready(function()
	{
		$('.profile-progress').show();
		CF.users('getUser', null, function(result)
		{
			$('.profile-progress').hide();
			if(result)
			{
				if(result.resources)
				{
					var userList = result.resources;
					for(var i=0; i<userList.length; i++)
					{
						if(userList[i].username == $('#username').attr('data-username'))
						{
							$('#id').val(userList[i].id);
							break;
						}
					}
//					if(profile.name.familyName)
//						$('#familyName').val(profile.name.familyName).next().addClass('active');
//					if(profile.name.givenName)
//						$('#givenName').val(profile.name.givenName).next().addClass('active');
				}
				else
				{
					$('.message').text(result.description ? result.description : JSON.stringify(result.error)).prev().hide();
				}
			}
			else
			{
				$('.message').text('Unknown Error').prev().hide();
			}
		},
		function(error)
		{
			$('.message').text(error).prev().hide();
		});
		
		formSubmit($('#profileForm'), function(data)
		{
			data.username = $('#username').attr('data-username');
			if(data.password != data.passwordConfirm)
			{
				$('.message').text('Password is not accord.');
				return;
			}
			
			$('.small-progress').css('display', 'inline-block').next().hide().next().hide();
			CF.users('password', data, function(result)
			{
				$('.small-progress').hide().next().show().next().show();
				if(result)
				{
					if(result.status == 'ok')
					{
						$('.message').text('Password is updated.').css('color', '#337ab7');
						setTimeout(function()
						{
							$('.message').text('').css('color', '');
						}, 3000);
					}
					else
					{
						$('.message').text(result.description ? result.description : JSON.stringify(result));
					}
				}
				else
				{
					$('.message').text('Unknown Error');
				}
			},
			function(error)
			{
				$('.small-progress').hide().next().show().next().show();
				$('.message').text(error);
			});
		});
		
		confirmButton($('.delete'), function(done)
		{
			$('.small-progress').css('display', 'inline-block').next().hide().next().hide();
			CF.users('withdrawal', {}, function(result)
			{
				$('.small-progress').hide().next().show().next().show();
				if(result)
				{
					CF.signout(function()
					{
						location.href = '/';	
					});
				}
				else
				{
					$('.message').text('Unknown Error');
				}
			},
			function(error)
			{
				$('.small-progress').hide().next().show().next().show();
				$('.message').text(error);
			});
		});
	});
})();