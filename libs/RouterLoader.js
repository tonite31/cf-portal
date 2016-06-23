var fs = require('fs');

(function()
{
	var loader = function(dir)
	{
		var files = fs.readdirSync(dir);
		
		for(var i=0; i<files.length; i++)
		{
			if(fs.lstatSync(dir + '/' + files[i]).isDirectory())
			{
				try
				{
					loader(dir + '/' + files[i]);
				}
				catch(err)
				{
					console.log(err.stack);
				}
			}
			else
			{
				if(dir.lastIndexOf("router") != dir.length-6 || files[i].lastIndexOf(".js") == -1)
					continue;
				
				var router = require(dir + '/' + files[i]);
				try
				{
					router(_app);
				}
				catch(err)
				{
					console.log(err.stack);
				}
			}	
		}
	};
	
	module.exports = loader;
})();