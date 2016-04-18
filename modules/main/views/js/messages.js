var messages = {};
messages.app_name_changed = 'Renamed app {origin} to {result}';

var getMessage = function(key, data)
{
	var msg = messages[key];
	for(var key in data)
	{
		var regx = new RegExp('{' + key + '}', 'gi');
		msg = msg.replace(regx, data[key]);
	}
	
	return msg;
};