var Renderer = {};

(function()
{
	this.replacePath = function(html, callback)
	{
		var matchList = html.match(/\@\{[a-zA-Z0-9\_\-\.\:\/]*\}/gi);
		if(matchList)
		{
			for(var i=0; i<matchList.length; i++)
			{
				var split = matchList[i].replace("@{", "").replace("}", "").split(":");
				
				var prefix = "main";
				var name = "";
				if(split.length == 2)
				{
					prefix = split[0];
					name = split[1];
				}
				else
				{
					name = split[0];
				}
				
				html = html.replace(matchList[i], "/modules/" + prefix + "/views/" + name);
			}
		}
		
		callback(html);
	};

}).call(Renderer);

module.exports = Renderer;