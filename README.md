# Replacement server for Minecraft Earth MSA, Xbox Live, and PlayFab services

This is a proof-of-concept/work-in-progress server for replacing the MSA, Xbox Live, and PlayFab services used by Minecraft Earth. Using this server requires patching the Minecraft Earth app to use a custom URL for the aforementioned services.

**This is a proof-of-concept. The code does not implement the appropriate security to be suitable for use in a production environment.**

Note that the API responses given by this server are by no means "complete" according to any "standard" or the behavior of the official APIs that it is replacing. API responses contain the minimum amount of data/fields/etc. required for the Minecraft Earth app to function correctly.

## Configuration

The server must be configured by editing `src/config.ts` and rebuilding (e.g. by running `npx tsc`). There is no configuration file at present.

There are two ways to use the server:
1. With separate base domains for each service
2. With a single domain or IP address

### Using separate base domains for each service

In this setup, the server will respond to requests on multiple subdomains of a base domain for each service. For example, setting the Xbox Live base domain to `xboxlive.lan` will cause the server to expect/respond to requests on `user.auth.xboxlive.lan`, `profile.xboxlive.lan`, and so on.

This setup requires a local DNS server to resolve the chosen base domains and all subdomains thereof to the IP address of the server. You cannot use IP addresses in this mode, only domains will work. Each base domain should be unique.

To use this mode, set `environment.singleDomainMode` to `null` and set `environment.liveBaseHost`, `environment.xboxliveBaseHost`, `environment.xboxabBaseHost`, and `environment.playfabapiBaseHost` according to your chosen base domains for each service.

### Using a single domain or IP address

In this setup, the server will respond to requests on a single domain or IP address for all services. Using this mode requires patching in the Minecraft Earth app in a special way that causes requests intended for one of multiple subdomains of a service base domain to instead be sent to a single domain/IP address, with the original intended subdomain included as part of the path (e.g. a request for `https://user.auth.xboxlive.com/user/authenticate` should become `http://192.168.1.123/user.auth.xboxlive.com/user/authenticate` when using this mode).

This setup works with either a domain or an IP address (in the latter case, no local DNS server is required).

To use this mode, set `environment.singleDomainMode` to your chosen domain or IP address. `environment.liveBaseHost`, `environment.xboxliveBaseHost`, `environment.xboxabBaseHost`, and `environment.playfabapiBaseHost` should match the original base domains for each service that the client intended to send the requests to.

### Other options

* `environment.protocol` Set to `http` or `https` according to if you want to use HTTP or HTTPS. (This only affects the way that the server responds to requests, you will need to set up an HTTPS reverse proxy separately.)

* `environment.port` Allows changing the port if required. Port number should **not** be included as part of the base domains or single domain.

* `login.useStableUserIds` If `true`, then the user ID generated during login is based on a hash of the provided username. This allows keeping your inventory/player data on the Minecraft Earth API server when you reinstall the client/clear app data (as the same user ID will be used when you log in again). Otherwise a random user ID will be generated for each login.

All other options do not need to be changed.
