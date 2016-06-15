var CF = {};

(function()
{
	this.request = function(param)
	{
		var successCallback = null;
		if(param.success)
		{
			successCallback = param.success;
			delete param.success;
		}

		var errorCallback = function(data) { console.error(data); };
		if(param.error)
		{
			errorCallback = param.error;
			delete param.error;
		}

		var json =
		{
			success: function(data)
			{
				if(data)
				{
					try
					{
						result = JSON.parse(data);
					}
					catch(err)
					{
						console.error(err.stack);
					}
				}
			}
		};

		for(var key in param)
		{
			if(param.hasOwnProperty(key))
			{
				json[key] = param[key];
			}
		}

		var result = null;
	    $.ajax(json);
	    
	    return result;
	};
	
	this.async = function(data, success, error, doNotParseJson)
	{
		var xmlhttp=new XMLHttpRequest();
		xmlhttp.open("POST", "/cf" + (this.url ? this.url : ''));
		xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xmlhttp.onreadystatechange = function() {
		    if (xmlhttp.readyState == XMLHttpRequest.DONE) {
		        if(xmlhttp.status == 200)
		        {
		        	if(xmlhttp.responseText == "signin")
		        	{
		        		location.href = "/";
		        	}
		        	else if(xmlhttp.responseText.indexOf('CERT_HAS_EXPIRED') != -1)
		        	{
		        		common_error('CERT_HAS_EXPIRED');
		        	}
		        	else
		        	{
		        		if(doNotParseJson)
		        			success.call(xmlhttp, xmlhttp.responseText);
		        		else
		        			success.call(xmlhttp, xmlhttp.responseText ? JSON.parse(xmlhttp.responseText) : '');
		        	}
		        }
		        else if(xmlhttp.status == 302 && xmlhttp.responseText == "signin")
		        {
		        	location.href = "/";
		        }
		        else if(xmlhttp.status == 201)
		        {
		        	success.call(xmlhttp, xmlhttp.responseText ? JSON.parse(xmlhttp.responseText) : '');
		        }
		        else
		        {
		        	console.log("에러");
		        	if(error)
		        		error(xmlhttp.responseText);
		        }
		    }
		}
		
		xmlhttp.send(JSON.stringify(data));
//		
//		$.ajax({url : "/cf", type : "post", data : data, success : function(result){
//			if(result == "signin")
//				location.href = "/signin";
//			else
//				success(JSON.parse(result));
//		}, error : function(result)
//		{
//			if(result.status == 302 && result.responseText == "signin")
//				location.href = "/signin";
//			
//			error(result);
//		}});
	};
	
	this.users = function(name, data, success, errorCallback)
	{
		$.ajax({
			url : '/users/' + name,
			type : 'post',
			data : data,
			success : success,
			error : function(error)
			{
				if(error.status == 302 && error.responseText == 'signin')
					location.href = '/signin';
				else
				{
					console.log("에러 : ", error);
					if(errorCallback)
						errorCallback(JSON.parse(error.responseText));
				}
			}
		});
	};
	
	this.signin = function(data, success, error)
	{
		$.ajax({
			url : '/cf/signin',
			type : 'post',
			data : data,
			success : success,
			error : error
		});
	};
	
	this.signout = function(success)
	{
		$.ajax({
			url : '/signout.do',
			type : 'post',
			success : success,
			error : common_error
		});
	};
	
	this.call = function(data)
	{
		return this.request({
	       url: "/cf",
	       type: 'post',
	       data : data,
	       async: false
	    });
	};
}).call(CF);