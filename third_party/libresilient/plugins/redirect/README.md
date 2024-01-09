# Plugin: `redirect`

- **status**: alpha
- **type**: [transport plugin](../../docs/ARCHITECTURE.md#transport-plugins)

This plugin redirects all requests, using a configured [HTTP Status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) and [message](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#redirection_messages), to URLs in a different domain.

For each request, the plugin removes the scheme and domain components, and appends the rest of the URL with the contents of `redirectTo` configuration variable. This allows for seamless redirection of all requests for URLs in the original domain to a new location, in case the original domain is expected to be permanently unavailable.

This plugin is, in a way, the last line of defense, and can be configured but not enabled (by setting the `enabled` configuration flag to `false`). In case of a permanent problem with the original domain visitors with the Service Worker installed and running can receive a [config update via alternative transports](../../docs/UPDATING_DURING_DISRUPTION.md) that enables this plugin, which in turn redirects them to the new domain of the website.

## Configuration

The `redirect` plugin supports the following configuration options:

 - `redirectTo` (required)  
   A string containing the base URL for all redirectons; should end in "`/`".
   
 - `redirectStatus` (default: `302`)  
 - `redirectStatusText` (default: "`Found`")
   These two config variables define the [HTTP status code and message](https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections) to be used for the redirect.
   
 - `enabled` (default: `false`)  
   If set to `false` the plugin is disabled, but still loaded into the service worker.  
   This is useful if you want to have the redirect plugin loaded and on the ready in case the original website goes completely down. Having the plugin loaded but disabled means that it can be enabled by a configuration change, which [can be pushed out even when the original website is not accessible](../../docs/UPDATING_DURING_DISRUPTION.md).
