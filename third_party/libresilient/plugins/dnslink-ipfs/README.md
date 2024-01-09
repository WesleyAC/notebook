# Plugin: `dnslink-ipfs`

- **status**: beta
- **type**: [transport plugin](../../docs/ARCHITECTURE.md#transport-plugins)

This transport plugin uses [IPFS](https://js.ipfs.tech/) to fetch remote content using the IPFS [CID](https://docs.ipfs.tech/concepts/content-addressing/) retrieved via [DNSLink](https://dnslink.org/) for the original domain. This enables content retrieval even if the website on the original domain is down for whatever reason.

## Configuration

No specific configuration is available.

## Description

This plugin relies on the [DNSLink standard](https://dnslink.org/) in order to resolve the IPFS [CID](https://docs.ipfs.tech/concepts/content-addressing/#identifier-formats) of the up-to-date content, and then uses [IPFS](https://docs.ipfs.tech/concepts/what-is-ipfs/#what-is-ipfs) to retrieve the content itself.

For this plugin to work, the website's domain needs to have the `_dnslink` DNS label with a `TXT` record pointing to the latest IPFS CID of content. [IPNS](https://docs.ipfs.tech/concepts/ipns/) DNSlinks are *not* supported currently, due to a [`js-ipfs` issue with IPNS resolution in the browser](https://github.com/ipfs/js-ipfs/issues/2921).

Deploying content to IPFS and updating the `_dnslink` `TXT` record is beyond the scope of this plugin, and needs to be set-up by the administrator of the website.

## Operation

IPFS is a good way of making static content available in a decentralized way. It uses content-addressing (IPFS address, or "CID", of a particular file depends on its contents), which means that a given CID will always identify a single specific file (or rather, its contents), as long as the file is available anywhere on the IPFS network.

IPFS CIDs can also exist for directories. In such cases, they reference CIDs of content (directories and files) contained within. Having a single CID of a directory of content hosted on IPFS is enough to be able to retrieve every file anywhere below in that directory structure.

However, content-addressing means that IPFS addresses are immutable. This is hardly acceptable for a website, so a strategy is needed to distribute the new IPFS CIDs each time the content changes. This is where DNSLink comes in — it specifies a standard way of distributing an up-to-date IPFS CID tied to a specific *domain name*. The IPFS CID for a DNSLink-enabled domain (like say, [`resilient.is`](https://resilient.is/)) can be found in the `TXT` record of the `_dnslink` name in it (so, [`_dnslink.resilient.is`](https://dns-lookup.com/_dnslink.resilient.is):

```bash
$ kdig +short TXT _dnslink.resilient.is.
"dnslink=/ipfs/QmPCXrKyVqeXfyZg4xhJFdQPeKqTPjJgdA65iqFvjVVKp2"
```

IPFS implementations, including the [`js-ipfs`](https://js.ipfs.io/) library used by this plugin, attempt to perform DNS lookups in a way that works around any potentiall local DNS issues. This means that even if a website using the `dnslink-ipfs` plugin is temporarily unavailable locally due to name resolution failure, as long as *some* IPFS nodes can resolve the `_dnslink` label, the plugin will work.

Once the `_dnslink` resolution is completed, `js-ipfs` is used to retrieve the content of the requested file directly from the IPFS network.

## Deploying content

This plugin focuses only on content retrieval. For it to work, the website needs to have a way of pushing content to IPFS and updating the `_dnslink` label with the new IPFS CID.

The former can be achieved by running your own IPFS node (using [Kubo](https://github.com/ipfs/kubo/), for example), or using third party [IPFS pinning service](https://docs.ipfs.io/concepts/persistence/#pinning-services).

The latter could involve using your DNS provider's API to automatically update the relevant `TXT` record, using [DNS Dynamic Update](https://www.rfc-editor.org/rfc/rfc2136) if supported by your DNS provider, or running your own minimal DNS server and delegating `_dnslink` zone to it from your main zone — this is the strategy used for `resilient.is` currently.

One important consideration is the Time-to-live (`TTL`) value on the `_dnslink` `TXT` record: if content updates happen often and need to propagate fast, it needs to be as low as possible, but that will drive more DNS traffic to the nameserver, which might be a consideration. A `TTL` of `900` (15min) is probably a reasonable compromise value to start with.

## Content Type of retrieved content

Content retrieved from IPFS does not have a `Content-Type` header set. To work around this, the plugin takes advantage of the [LibResilient's `guessMimeType()` API](../../docs/ARCHITECTURE.md#mime-type-guessing). Please have a look at that documentation to understand how to use it most effectively.
