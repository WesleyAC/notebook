# Plugin: `gun-ipfs`

- **status**: proof-of-concept, broken
- **type**: [transport plugin](../../docs/ARCHITECTURE.md#transport-plugins)

This plugin uses [GunDB](https://gun.eco/) as a source of information on current [IPFS CIDs](https://docs.ipfs.io/concepts/content-addressing/) of content, and retrieves that content using [JS IPFS](https://github.com/ipfs/js-ipfs).

## Configuration

*TBD*

## Operation

*TBD*

## Content Type of retrieved content

Content retrieved from IPFS does not have a `Content-Type` header set. To work around this, the plugin takes advantage of the [LibResilient's `guessMimeType()` API](../../docs/ARCHITECTURE.md#mime-type-guessing). Please have a look at that documentation to understand how to use it most effectively.
