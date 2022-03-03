---
{
	"timezone": "Asia/Taipei",
	"location": "Taipei, Taiwan"
}
---
# A IndieWeb Request

Hi. Do you consider yourself a part of the IndieWeb community? I know a handful of you follow my blog :)

I want to participate in the IndieWeb community. Despite my reservations,
@sidenote: For instance, around [POSSE](/indieweb-thoughts-posse/) and [ActivityPub](/identity-and-decentralization/).
I think there's a lot of exciting and important work going on under the IndieWeb umbrella. The problem is, it's very difficult to figure out *how* to join.

I've had implementing [webmentions](https://www.w3.org/TR/webmention/) on my [TODO list](https://github.com/WesleyAC/notebook/blob/df6a3c0b101d2d24f6c35f38fcacf09f3b45c892/README.md#future-work) for this blog for a while now. It seems like the easiest way to receive webmentions is via [webmention.io](https://webmention.io/). The problem is, doing that requires using IndieAuth, which I haven't set up. This was originally because my main domain, [wesleyac.com](https://wesleyac.com/) was a redirect to [my blog](https://blog.wesleyac.com/), and I couldn't find a simple way to keep that in place and also use IndieAuth.

I thought about raising this issue on the IndieWeb wiki, but… that also requires a IndieAuth login!

One of the IndieWeb principles is [plurality](https://indieweb.org/principles#Plurality), but the IndieWeb seems to have a monoculture around auth, which means that anyone who isn't able to or doesn't want to set up IndieAuth is barred from participating in large parts of the community. This is made worse by the fact that identity is both high-stakes and complex — I'd personally rather play with parts of the IndieWeb that appeal to me more than IndieAuth first, as a way of dipping my toes in, before committing to using the identity system, which I'm currently a little dubious of.

Webmentions solve a huge problem with the web today, and it makes me sad to see them locked behind the technical hurdles of either implementing them oneself or setting up IndieAuth. Please give me a easy way to use them without having to jump over a bunch of technical hurdles!

If you're working on fixing this, or know of a easy way to use webmentions without IndieAuth today, please do [email me](mailto:me@wesleyac.com), since, uh, I'm not gonna see your webmentions at the moment.

*Update: I decided to stop being lazy and put together the thing I want to see: [webmention.wesleyac.com](https://webmention.wesleyac.com) ([source](https://github.com/wesleyac/webmention-receiver)). The broader point still stands, though: I can't, for instance, link to this on the IndieWeb wiki without implementing IndieAuth, nor can I use most of the webmention testing tools, which also generally require IndieAuth.*
