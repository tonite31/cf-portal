var fs = require('fs');

(function()
{
	var modules = {};
	
	var loader = {};
	loader.load = function(dir)
	{
		var files = fs.readdirSync(dir);
		
		for(var i=0; i<files.length; i++)
		{
			if(fs.lstatSync(dir + '/' + files[i]).isDirectory())
			{
				loader.load(dir + '/' + files[i]);
			}
			else
			{
				if(dir.lastIndexOf("binder") != dir.length-6 || files[i].lastIndexOf(".js") == -1)
					continue;
				
				var module = require(dir + '/' + files[i]);
				for(var key in module)
				{
					modules[key] = module[key];
				}
			}	
		}
	};
	
	loader.modules = modules;
	
	module.exports = loader;
})();