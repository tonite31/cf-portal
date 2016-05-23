var Pumpkin = function()
{
	this.data = null;
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

try
{
	module.exports = Pumpkin;	
}
catch(err)
{}