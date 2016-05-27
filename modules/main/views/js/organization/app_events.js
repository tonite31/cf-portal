(function()
{
	_ee.on('app_detail_events', function(context, app)
	{
		$(context).find('.eventsProgress').show().next().hide();
		
		//최초 한달간의 이벤트들을 불러온다.
		var today = new Date();
		today.setMonth(-1);
		var year = today.getFullYear();
		var month = today.getMonth() + 1;
		month = month < 10 ? '0' + month : month;
		var date = today.getDate();
		date = date < 10 ? '0' + date : date;
		
		CF.async({url : '/v2/events?order-direction=desc&q=actee:' + app.metadata.guid + '&q=timestamp>' + year + '-' + month + '-' + date, method : 'GET'}, function(result)
		{
			if(result)
			{
				if(result.resources)
				{
					$(context).find('.eventsProgress').hide().next().show().next().hide();
					
					var html = '';
					var eventList = result.resources;
					if(eventList)
					{
						for(var i=0; i<eventList.length; i++)
						{
							var actor = eventList[i].entity.actor_name;
							var timestamp = eventList[i].entity.timestamp;
							var type = eventList[i].entity.type;
							
							var template = $('#appEventsRowTemplate').html();
							
							html += template.replace(/{actor}/gi, actor).replace(/{timestamp}/gi, timestamp).replace(/{type}/gi, type);
						}
					}
					
					$(context).find('.events-table tbody').html(html);
				}
				else
				{
					$(context).find('.eventsProgress').hide().next().hide().next().text(result.description).show();
				}
			}
			else
			{
				$(context).find('.eventsProgress').hide().next().show().next().hide();
			}
		},
		function(error)
		{
			$(context).find('.eventsProgress').hide().next().hide().next().text(error).show();
		});
		
		$(context).find('.more-events').on('click', function()
		{
			today.setMonth(today.getMonth()-1);
			var year2 = today.getFullYear();
			var month2 = today.getMonth() + 1;
			month2 = month2 < 10 ? '0' + month2 : month2;
			var date2 = today.getDate();
			date2 = date2 < 10 ? '0' + date2 : date2;
			
			var that = this;
			$(this).hide().prev().css('display', 'inline-block');
			CF.async({url : '/v2/events?order-direction=desc&q=actee:' + app.metadata.guid + '&q=timestamp<' + year + '-' + month + '-' + date + '&q=timestamp>' + year2 + '-' + month2 + '-' + date2, method : 'GET'}, function(result)
			{
				if(result)
				{
					if(result.resources)
					{
						if(result.resources.length > 0)
						{
							var html = '';
							var eventList = result.resources;
							if(eventList)
							{
								for(var i=0; i<eventList.length; i++)
								{
									var actor = eventList[i].entity.actor_name;
									var timestamp = eventList[i].entity.timestamp;
									var type = eventList[i].entity.type;
									
									var template = $('#appEventsRowTemplate').html();
									
									html += template.replace(/{actor}/gi, actor).replace(/{timestamp}/gi, timestamp).replace(/{type}/gi, type);
								}
							}
							
							$(that).show().prev().hide();
							$(context).find('.events-table tbody').append(html);
						}
						else
						{
							$(that).prev().hide().next().next().text('no more events.');
							setTimeout(function()
							{
								$(that).show().prev().hide().next().next().text('');
							}, 1000 * 3);
						}
					}
					else
					{
						$(context).find('.events-message').text(result.description);
					}
				}
				else
				{
					$(context).find('.events-message').text('no more events.');
				}
			},
			function(error)
			{
				$(context).find('.events-message').text(error);
			});
		});
	});
})();