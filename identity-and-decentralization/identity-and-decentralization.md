# Identity and Decentralization

Continuing my thoughts and complaints about [identity and the future of the web](/indieweb-thoughts-posse), let's turn today to the most successful modern decentralized web system: ActivityPub, the system behind [Mastodon](https://joinmastodon.org/) (a decentralized Twitter alternative).

Mastodon's decentralization model is pretty simple, from a technical perspective. There are servers, which anyone can run. Those servers are identified by their domain name, just like any other website, and the can "federate" — share data with each other via a (semi)-standardized HTTP/JSON API. A "user" is an object on a particular server, identified in a email-esque way (<a href="https://interlace.space/@wesleyac">@wesleyac@interlace.space</a>, for instance).

There's a sort of obvious problem here, though — there's a conflation of the technical aspects of running a server with the social aspects of running a community. [Darius](https://tinysubversions.com/) talks about this in [runyourown.social](https://runyourown.social/):

> Do not fool yourself into thinking that your job as an administrator is primarily technical. It's social first, and technical second. If you want to only focus on the tech, then please find someone who cares deeply about the social organizing side and recruit them as a co-administrator.
>
> *[…]*
>
> The existence of a server and an administrator implies some local form of centralization. I think this is necessary because most people don't want to run their own network node, and there are fantastic benefits to having a trusted local administrator. That said, the drawbacks are also great and we need to be able to mitigate the drawbacks.

The fundamental problem here is that ActivityPub links identity to domain names, which are centrally controlled and not generally owned directly by users.
@sidenote: Single-user instances are essentially a reaction to that.

There is work towards providing more fluidity of identity in Mastodon/ActivityPub, which is valuable and good, but it's fundamentally really hard, since are a very low level, the protocol enforces the role of domain names/servers in identity.

There are systems that don't have this conflation, but they tend to have other problems. One particularly interesting example is [Scuttlebutt](https://scuttlebutt.nz/), which uses a cryptographic key as the base of identity. Doing so isn't without problems (getting users without experience to manage cryptographic keys well is really hard), but it's a much more solid philosophical base for identity than domain names are.

A problem with Scuttlebutt, though, is that it eschews the concept of having distinct communities altogether — there is essentially one global system that all messages are replicated across.
@sidenote: Pedants will point out that you can have different communities by not sending your messages to the global instance, but instead setting up your own closed system of federation. If you were going to say that — have you tried it? The tools are very, very obviously not built for it.

It's sad to me that the DAO bros have essentially stumbled upon a more philosophically sound model of identity and community essentially by accident — since most DAOs are built on Ethereum
@sidenote: Which is fundamentally a pretty dumb choice, but that's a post for another day.
they get cryptographic-keys-as-identity for free, and then built communities on top of that. There's no fundamental reason why we can't do that with existing internet and web infrastructure, though — it's easy to imagine a world where servers provide hosting and UI, ad-hoc communities (which are not encoded in any technically-delimited way) perform moderation, and individuals own their identity via cryptographic keys.
