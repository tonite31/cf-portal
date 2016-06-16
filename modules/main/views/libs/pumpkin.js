var Pumpkin = function()
{
	this.state = 0;
	this.data = {};
	this.works = {};
};

Pumpkin.prototype.setData = function(data)
{
	this.data = data;
};

Pumpkin.prototype.addWork = function(name, work)
{
	this.works[name] = work;
};

Pumpkin.prototype.execute = function(list, done, error, index, params)
{
	if(list)
	{
		var name = '';
		try
		{
			if(!index)
				index = 0;
			
			if(typeof index == 'object')
			{
				params = index;
				index = 0;
			}
			
			if(list.length == index)
			{
				if(done)
					done.call({data : this.data}, params);
				
				return;
			}
			
			var that = this;
			name = list[index];
			if(typeof name == 'object')
			{
				params = params ? params : {};
				for(var key in name.params)
				{
					params[key] = name.params[key];
				}
				
				name = name.name;
			}
			
			var work = this.works[name];
		
			if(work)
			{
				work.call({data : this.data, next : function(params)
				{
					that.execute(list, done, error, index+1, params);
				}, error : function(err)
				{
					if(error)
						error(name, err);
				}}, params);
			}
			else
			{
				this.execute(list, done, error, index+1, null);
			}
		}
		catch(err)
		{
			if(error)
				error(name, err);
		}
	}
	else
	{
		console.log('pumpkin.execute - First arguments must not be null.');
	}
};

Pumpkin.prototype.executeAsync = function(list, done, error, index, params)
{
	var context = this;
	
	if(list)
	{
		var name = '';
		try
		{
			if(!index)
				index = 0;
			
			if(typeof index == 'object')
			{
				params = index;
				index = 0;
			}
			
			if(index == 0)
			{
				context = new Pumpkin();
				context.id = new Date().getTime();
				context.state = this.state;
				context.data = this.data;
				context.works = this.works;
			}
			
			if(list.length == 0)
			{
				if(typeof done == 'function')
					done.call(context, params);
			}
			else if(index < list.length)
			{
				name = list[index];
				if(typeof name == 'object')
				{
					params = params ? params : {};
					for(var key in name.params)
					{
						params[key] = name.params[key];
					}
					
					name = name.name;
				}
				
				var work = context.works[name];
				if(work)
				{
					try
					{
						work.call({data : context.data, next : function()
						{
							context.state++;
							if(context.state == list.length)
							{
								if(typeof done == 'function')
									done.call(context, params);
							}
						}, error : function(err)
						{
							if(error)
								error(name, err);
						}}, params);
					}
					catch(err)
					{
						console.error(err.stack);
					}
					finally
					{
						context.executeAsync(list, done, error, index+1, params);
					}
				}
				else
				{
					context.executeAsync(list, done, error, index+1, null);
				}
			}
		}
		catch(err)
		{
			if(error)
				error(name, err);
		}
	}
	else
	{
		console.log('pumpkin.executeAsync - First arguments must not be null.');
	}
};

try
{
	module.exports = Pumpkin;	
}
catch(err)
{}