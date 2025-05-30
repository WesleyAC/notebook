---
{
	"timezone": "Asia/Taipei",
	"location": "Taipei, Taiwan"
}
---
# How Websites Die

I recently started compiling a [list of defunct blogging platforms](https://www.are.na/wesleyac/defunct-blogging-platforms). It's been interesting to see how websites die — from domain parking pages to timeouts to blank pages to outdated TLS cipher errors, there are a multitude of different ways.

Tied for the most common are two very different modalities: the opportunistic vultures of domain parking pages, and the natural cycle of life and death: a new website, unconnected from what was once there by everything except name. For instance, Vox.com, now a popular news website, was once a blogging platform. Pitas.com, among the oldest blogging platforms, is now a french magazine. Calepin.co, which offered a way to convert a dropbox folder of markdown files into a website, is now a agency for writers. None of these sites offer any evidence of what was there before them. When buildings are torn down and rebuilt, the ghost of the old building is often visible in the new one — strangely angled walls and rooms, which make sense only in the context of the space as a living organism. On the web, there are no such restrictions: when a website dies, it leaves no sign of its past self behind. The closest you might come to seeing signs of this cycle is witnessing the birth of a new website. Updog.co was once a Dropbox-based hosting platform, but is now a landing page for startup that will "Upgrade Your Dog's Lifestyle", which promises to be "unleashed soon".

Various technical errors add up to significant percentage as well: Failed DNS resolution is the most common — Firefox reports "Hmm. We're having trouble finding that site", followed by server timeouts. One site offered a SSL version that had long since been deprecated, while another served up a error page from Cloudflare. Yet another redirected infinitely, with firefox finally giving up and throwing an error.

Spam website were also common, most disguised as "news" websites, although some pretended to be products, hoping that visitors wouldn't notice that there was no way to actually buy any of the services advertised. A enterprising online casino bought one of the domains to serve as a redirect, presumably as some sort of SEO strategy.

A depressingly small number seemed to have planned out their deaths, with landing pages announcing the shutdown. A few had lengthy blog posts explaining why their authors could no longer support them, but others offered no explanation — Posterous.com simply wrote "Posterous Spaces is no longer available", with no further explanation. Advogato redirected to a copy of the website on the Internet Archive, with the last post announcing their shutdown.

A couple of the websites were simply frozen in time — no longer allowing signups, but with no obvious indication that they'd closed down other than a copyright date a few years old.

And finally, there were a small smattering of sites that were entirely or almost entirely blank: just a white page, maybe with a cryptic bit of text or two. I wonder who's still running those servers. Do they even know that they're still online, or have they been long forgotten, doomed to make their final disappearance when someone mistakenly realizes that they don't need to keep paying the bill for that server — it's not doing anything, anyways.

I think a lot about the lifecycle of websites. I'm frustrated by so much of the short-term thinking I see in the world today, and the way we think about websites is a part of that: it's "normal" for them to just go up in smoke as soon as their authors stop paying attention. People switch platforms and providers and break links without a second thought. It pains me to see people build websites with no feeling of obligation to them — when you put something out into the world, it is your responsibility to care for it.

At the same time, I wonder if this obsession with permanence is misplaced. I recently started building a website that lives at [wesleyac.com](https://wesleyac.com), and one of the things that made me procrastinate for years on putting it up was not being sure if I was ready to commit to it. I solved that conundrum with a [page outlining my thoughts on its stability and permanence](https://wesleyac.com/stability.html):

> this website (everything residing on the domain "wesleyac.com", excluding subdomains) should be thought of as a jungle — attempts to link to it are at your own risk.
>
> you may attempt to archive it, but should you wish to avoid sadness down the line, you should accept now in your heart that all archives will eventually succumb to the sands of time.

And I also included this lovely quote from *A Psalm for the Wild-Built* by Becky Chambers:

> It is difficult for anyone born and raised in human infrastructure to truly internalize the fact that your view of the world is backward. Even if you fully know that you live in a natural world that existed before you and will continue long after, even if you know that the wilderness is the default state of things, and that nature is not something that only happens in carefully curated enclaves between towns, something that pops up in empty spaces if you ignore them for a while, even if you spend your whole life believing yourself to be deeply in touch with the ebb and flow, the cycle, the ecosystem as it actually is, you will still have trouble picturing an untouched world. You will still struggle to understand that human constructs are carved out and overlaid, that these are the places that are the in-between, not the other way around.

Writing that warning was enough to satisfy my feeling of obligation, but I don't think it's right for everything. One of the reasons I was interested in blogging platforms is because I run a small [microblogging site](https://thoughts.page/), and I feel a obligation to the people who use it to keep it running. As I picked through the graveyard of defunct blogging sites, there were countless stories of people who'd lost years of their personal history, whether due to database crashes or simply the website operators getting tired. The creator of Scribble.nu, one of the earliest blogging platforms, [wrote](https://web.archive.org/web/20131120035936/https://dustin.io/things-i-did/) that it:

> Became insanely popular at the time, serving almost 100,000 users before it imploded from its success. I spent literally hundreds of hours tweaking our strained servers (two of them: one web server, one database server) to support an ever increasing load. I still receive hate mail occasionally wondering why I had to take this service off line. When you have to decide between paying your server bills or your rent, something has to give.

And I'm certainly sympathetic to that — the reality is that making things last on the web is hard because the web was not made to build things that last. Trying to keep websites around forever is struggling against the nature of the web. I think, though, that that struggle is often worthwhile.

For my part, I try to think as I'm launching things about what my commitment to them is, and to be explicit about that. I keep all my domain names paid up for a decade, the longest that ICANN allows. Still, though, if I died today, [thoughts.page](https://thoughts.page) would probably only last until my credit card expires and DigitalOcean shuts down my servers.

[Winnie Lim](https://winnielim.org/journal/on-writing-to-exist-and-website-graveyards/) has similar concerns:

> One of the things I think about once in a while is the existence of this website once I am no longer around. I think it is a bit ironic for a person who is chronically suicidal to care about her website’s existence after she’s dead.
>
> > we pay for a one-time fee to house our remains when we die (at least over here in sg), I wish there's a similar service for our websites when we die.
> >
> > — Winnie Lim (@wynlim) November 7, 2020
>
> Websites shouldn’t have to go offline once their creators are dead, yet they mostly will unless they are hosted on a free service that will likely sustain long-term into the future (i.e. wordpress.com or github). I believe websites will be future archaeological artefacts. I hope there’s a website graveyard where I can house this before I die.

I've often thought about getting together with some friends to pay into a fund to house our websites after we die. I don't think setting that up would be too hard — the math around insurance policies of this sort is quite simple
@sidenote: For instance, a safe withdrawal rate of 3% and a cost of $12 for domain renewal would mean that a one-time payment of $400 should be enough to keep a website up ~forever.
— I mostly haven't tried to set something like this up just since it's a pretty morbid ask. But, if you'd be interested, maybe reach out to me?

Our ghosts could live forever, if we help each other.
