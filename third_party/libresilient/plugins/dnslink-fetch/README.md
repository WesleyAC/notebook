# Plugin: `dnslink-fetch`

- **status**: beta
- **type**: [transport plugin](../../docs/ARCHITECTURE.md#transport-plugins)

This transport plugin uses standard [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/fetch) to retrieve remote content from alternative endpoints — that is, HTTPS endpoints that are not in the original domain. This enables retrieving content even if the website on the original domain is down for whatever reason. The list of alternative endpoints is itself retrieved using [DNSLink](https://dnslink.org/) for the original domain.

Compare: [`alt-fetch`](../alt-fetch/).

As per LibResilient architecture, this plugin adds `X-LibResilient-Method` and `X-LibResilient-ETag` headers to the returned response.

## Configuration

The `dnslink-fetch` plugin supports the following configuration options:

 - `concurrency` (default: 3)  
   Number of alternative endpoints to attempt fetching from simultaneously.  
   If the number of available alternative endpoints is *lower* then `concurrency`, all are used for each request. If it is *higher*, only `concurrency` of them, chosen at random, are used for any given request.

 - `dohProvider` (default: "`https://dns.hostux.net/dns-query`")  
   DNS-over-HTTPS JSON API provider/endpoint to query when resolving the DNSLink. By default using [Hostux DoH endpoint](https://dns.hostux.net/en/). Other options:
   - "`https://dns.google/resolve`"  
     Google DNS DoH JSON API endpoint
   - "`https://cloudflare-dns.com/dns-query`"  
     CloudFlare's DoH JSON API endpoint
   - "`https://mozilla.cloudflare-dns.com/dns-query`"  
     Mozilla's DoH JSON API endpoint, operated in co-operation with CloudFlare.
     
 - `dohMediaType` (default: `application/dns-json`)  
   Media type to use in requests. When set to `application/dns-message`, requests will be made using the binary DNS wire format. If set to anything else, they will be made using the JSON format. JSON format is much less popular (many fewer available public DoH resolvers support it), but handles internationalized domain names (IDNs) better.

 - `dohMethod` (default: `GET`)  
   The HTTP method to use when making DNS-over-HTTPS requests. It can only be "`POST`" or "`GET`". It is only meaningful when `dohMediaType` is set to `application/dns-message` -- that is, only when the binary DNS wire format is being used. DoH JSON API requests can only be made using HTTP `GET`, so `dohMethod` setting is ignored when the `dohMediaType` is set to anything other than "`application/dns-message`".

## Operation

When fetching an URL, `dnslink-fetch` removes the scheme and domain component. Then, for each alternative endpoint that is used for this particular request (up to `concurrency` of endpoints, as described above), it concatenates the endpoint with the remaining URL part. Finally, it performs a [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/fetch) request for every URL construed in such a way.

DNS requests are made either using the DNS-over-HTTPS JSON format (default), or using the DNS wire format (when `dohMediaType` is set to "`application/dns-message`"). JSON format handles internationalized domain names (IDNs) better, but there are fewer available public resolvers that support it.

Let's say the plugin is deployed for website `https://example.com`, with `concurrency` set to `2` and these are the alternative endpoints specified in relevant TXT records according to the DNSLink specification (so, in [multiaddr form](https://github.com/multiformats/multiaddr#encapsulation-based-on-context)):
 - `dnslink=/https/example.org`
 - `dnslink=/https/example.net/alt-example`
 - `dnslink=/https/eu.example.cloud`
 - `dnslink=/https/us.example.cloud`

***Notice**: `dnslink-fetch` currently only supports a rudimentary, naïve form of [multiaddr](https://multiformats.io/multiaddr/) addresses, which is `/https/domain_name[/optional/path]`; full mutiaddr support might be implemented at a later date.*

A visitor, who has visited the `https://example.com` website at least once before (and so, LibResilient is loaded and working), tries to access it. For whatever reason, the `https://example.com` site is down or otherwise inaccessible, and so the `dnslink-fetch` plugin kicks in.

The request for `https://example.com/index.html` is being handled thus:

1. scheme and domain removed: `index.html`
2. two (based on `concurrency` setting) random alternative endpoints selected:
   - `dnslink=/https/example.net/alt-example`
   - `dnslink=/https/example.org`
3. resolve endpoint multiaddrs to URL of each endpoint:
   - `https://example.net/alt-example/`
   - `https://example.org/`
4. `fetch()` request issued simultaneously for URL (so, alternative endpoint concatenated with the path from hte original request):
   - `https://example.net/alt-example/index.html`
   - `https://example.org/index.html`
5. the first successful response from either gets returned as the response for the whole plugin call.
