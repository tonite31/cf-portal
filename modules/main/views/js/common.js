var _global = {};
(function()
{
	this.makeHash = function()
	{
		var hash = '';
		
		for(var key in this.hash)
		{
			if(key)
			{
				if(hash)
					hash += '&';
				
				hash += key + '=' + this.hash[key];
			}
		}
		
		location.hash = hash;
	};
	
	this.parseHash = function()
	{
		_global.hash = {};
		var hash = location.hash.substring(1);
		hash = hash.split('&');
		for(var i=0; i<hash.length; i++)
		{
			var split = hash[i].split('=');
			_global.hash[split[0]] = split[1];
		}
	};
	
	this.parseHash();
	
//	this.setUrl = function()
//	{
//		var url = location.pathname;
//		url = url.substring(1);
//		
//		if(url[url.length-1] == '/')
//			url = url.substring(0, url.length-1);
//		
//		url = url.split('/');
//		
//		this.url = url;
//	};
//	
//	this.setUrl();
}).call(_global);

var _ee = new EventEmitter();
var common_board = function(type, msg)
{
	console.log("머지 : ", type, msg);
	alert('[' + type + ']' + msg);
//	var span = $('<div class="' + type + '">' + msg + '</div>');
//	
//	$('.alert-board').append(span);
//
//	setTimeout(function()
//	{
//		span.css('opacity', 1);
//	}, 100);
//	
//	setTimeout(function()
//	{
//		span.css('opacity', 0);
//		
//		setTimeout(function()
//		{
//			span.remove();
//		}, 500);
//	}, 5100);
};

var common_success = function(msg)
{
	common_board('alert alert-success', msg);
};

var common_info = function(msg)
{
	common_board('alert alert-info', msg);
};

var common_error = function(error)
{
	common_board('alert alert-danger', (typeof error == 'object' ? JSON.stringify(error) : error));
	console.error(error);
};

var common_warning = function(msg)
{
	common_board('alert alert-warning', msg);
};

var confirmButton = function(selector, callback)
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
					that.isConfirm = false;
					$(that).text(that.origin).val(that.origin);
					
					$(that).prev().remove();
					$(that).show();
				});
			}
		}
		else
		{
			this.origin = $(this).text() ? $(this).text() : $(this).val();
			$(this).css('opacity', '0');
			setTimeout(function()
			{
				that.isConfirm = true;
				$(that).css('opacity', '1').text('Confirm');
				
				setTimeout(function()
				{
					that.isConfirm = false;
					$(that).text(that.origin).val(that.origin);
				}, 3000);
			}, 300);
		}
	});
};

var confirmSpan = function(selector, callback)
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
			this.originClass = this.className;
			this.isConfirm = true;
			
			$(this).css('opacity', '0');
			setTimeout(function()
			{
				$(that).css('opacity', '1').attr('class', 'btn btn-danger').text('Confirm');
				setTimeout(function()
				{
					that.isConfirm = false;
					$(that).attr('class', that.originClass).text('');
				}, 3000);
			}, 300);
		}
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

var ForEach = function()
{
	this.state = 0;
};

ForEach.prototype.sync = function(list, work, done, index)
{
	if(!index)
		index = 0;
	
	var that = this;
	if(index == list.length)
	{
		if(typeof done == 'function')
			done();
		
		return;
	}
	else
	{
		work.call({done : function()
		{
			that.sync(list, work, done, index+1);
		}}, list[index], index);
	}
};

ForEach.prototype.async = function(list, work, done, index)
{
	if(!index)
		index = 0;
	
	var that = this;
	if(list.length == 0)
	{
		if(typeof done == 'function')
			done();
	}
	else if(index < list.length)
	{
		work.call({done : function()
		{
			that.state++;
			if(that.state == list.length)
			{
				if(typeof done == 'function')
					done();
			}
		}}, list[index], index);
		
		this.async(list, work, done, index+1);
	}
};


var _IntervalTimer = {};

(function()
{
	this.timers = {};
	this.callbacks = {};
	this.counts = {};
	this.times = {};
	
	this.addTimer = function(name, time, work, intervalCallback)
	{
		this.times[name] = time;
		this.counts[name] = time;
		var that = this;
		this.callbacks[name] = function()
		{
			if(intervalCallback)
				intervalCallback(that.counts[name]);
			
			that.counts[name]--;
			
			if(that.counts[name] == -1)
			{
				clearInterval(that.timers[name]);
				that.timers[name] = null;
				
				work(function()
				{
					that.counts[name] = time;
					that.start(name);
				});
			}
		};
	};
	
	this.start = function(name)
	{
		var callback = this.callbacks[name];
		
		var timer = this.timers[name];
		if(timer)
		{
			clearInterval(timer);
			timer = null;
		}
		
		if(callback)
			this.timers[name] = setInterval(callback, 1000);
	};
	
	this.end = function(name)
	{
		if(this.timers[name])
		{
			clearInterval(this.timers[name]);
			this.timers[name] = null;
			
			this.counts[name] = this.times[name];
		}
	};
	
}).call(_IntervalTimer);