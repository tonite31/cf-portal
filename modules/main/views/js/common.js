var _global = {};
(function()
{
	this.setUrl = function()
	{
		var url = location.pathname;
		url = url.substring(1);
		
		if(url[url.length-1] == '/')
			url = url.substring(0, url.length-1);
		
		url = url.split('/');
		
		this.url = url;
	};
	
	this.setUrl();
}).call(_global);

var _ee = new EventEmitter();
var common_board = function(type, msg)
{
	var span = $('<div class="' + type + '">' + msg + '</div>');
	
	$('.common-board').append(span);

	setTimeout(function()
	{
		span.css('opacity', 1);
	}, 100);
	
	setTimeout(function()
	{
		span.css('opacity', 0);
		
		setTimeout(function()
		{
			span.remove();
		}, 500);
	}, 5100);
};

var common_alert = function(msg)
{
	common_board('alert', msg);
};

var common_error = function(error)
{
	common_board('error', error);
	console.error(error);
};

var common_warning = function(msg)
{
	common_board('warning', msg);
};

var confirmButton = function(element, callback)
{
	$(element).find("span:first").on("click", function()
	{
		var that = this;
		$(this).hide().next().show();
		setTimeout(function()
		{
			$(that).next().css('opacity', 1);
		}, 100);
		
		setTimeout(function()
		{
			$(that).next().css('opacity', 0);
			setTimeout(function()
			{
				$(that).next().hide();
				$(that).show();
			}, 100);
		}, 3000);
	});
	
	$(element).find("span:last").on("click", function()
	{
		if(callback)
			callback.call(this);
	});
};

var editableText = function(element, callback)
{
	$(element).on('click', function()
	{
		var value = $(this).text();
		$(this).attr('contenteditable', '').focus();
		
		$(this).on('keydown', function(e)
		{
			if(e.keyCode == 13)
			{
				if(value != $(this).text() && callback)
					callback($(this).text());
				
				$(this).off('keydown').off('blur').removeAttr('contenteditable');
				
				e.preventDefault();
				e.stopPropagation();
			}
			else if(e.keyCode == 27)
			{
				$(element).off('keydown').off('blur').text(value).removeAttr('contenteditable');
			}
		});
		
		$(this).on('blur', function()
		{
			if(value != $(this).text() && callback)
				callback($(this).text());
			
			$(this).off('keydown').off('blur').removeAttr('contenteditable');
		});
	});
};

var requiredValidation = function(element)
{
	var check = false;
	$(element).find('*[required]').each(function()
	{
		if($(this).val() == null || $(this).val() == '' || $(this).val() == undefined)
		{
			check = true;
			$(this).addClass('is-required');
			
			var that = this;
			setTimeout(function()
			{
				$(that).removeClass('is-required');
			}, 5000);
		}
		else
		{
			$(this).removeClass('is-required');
		}
	});
	
	if(check)
	{
		common_warning('Please enter the values.');
	}

	return !check;
};