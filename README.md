#CF Portal

CF Portal is a web-frontend for cloundfoundry based on nodejs.

##Getting Started
1. Clone the project: https://github.com/tonite31/cf-portal
2. Change directory to cf-protal : <code>cd cf-protal</code>
3. Change the manifest.yml to your options.
4. Change the config.json to the endpoint and admin user information. If you don't input admin user information, you could not use several features.<br/>
4-1. Enter the smtps account information. this used for invite to another user.<br/>
4-2. If you want to use redis, enter the redis server information to config.json.<br/>
5. Install npm packages : <code>npm install</code>
6. Push this application to Cloud Foundry using the cf Command Line Interface (CLI): <code>cf push.</code>

##License
Code licensed under <a href="https://github.com/tonite31/cf-portal/blob/master/LICENSE">MIT</a>
