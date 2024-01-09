# Plugin: `ipns-ipfs`

- **status**: proof-of-concept, broken
- **type**: [transport plugin](../../docs/ARCHITECTURE.md#transport-plugins)

This is a stub of a plugin retrieving content using [IPFS](https://js.ipfs.tech/) and [IPNS](https://docs.ipfs.tech/concepts/ipns/).

## Configuration

*TBD*

## Operation

*TBD*

## Content Type of retrieved content

Content retrieved from IPFS does not have a `Content-Type` header set. To work around this, the plugin takes advantage of the [LibResilient's `guessMimeType()` API](../../docs/ARCHITECTURE.md#mime-type-guessing). Please have a look at that documentation to understand how to use it most effectively.
