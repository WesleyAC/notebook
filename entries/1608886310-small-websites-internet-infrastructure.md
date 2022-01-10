---
{
	"timezone": "ROC",
	"location": ""
}
---
# Small Websites & Internet Infrastructure

The technical circles I'm tend to care a lot about making small, fast, efficient websites. We've got [clubs](https://1mb.club/) on [clubs](https://250kb.club/) on [clubs](https://10kbclub.com/) preaching the gospel of small websites. I get this — if you have a slow connection [most of the web is unusable](https://danluu.com/web-bloat/), and there's a sort of preposterous exuberance in using megabytes of data to present a few paragraphs of text. I'm sympathetic to this cause.

But at the same I can't help but wonder if the focus on bundle sizes is missing the forest for the trees. Most of the web is unusable on a slow connection, but why are connections so slow in the first place? I signed up for a cell plan in [Taiwan](/taiwan/) a few days ago — it provides me with unlimited data, 50-75Mbps down
@sidenote: As measured by [fast.com](https://fast.com)
, and works anywhere in the country, all for less than $18USD/month.
@sidenote: It costs NT$488/month, which comes out to US$17.38/month at today's exchange rate.
I haven't been bothering to use wifi, since tethering to my cell phone is far more convenient, and provides me with speeds about the same as my residential internet when I was living in San Francisco. Meanwhile, Comcast is [charging people extra to go above a 1.2TB data cap](https://www.theverge.com/22177154/us-internet-speed-maps-competition-availability-fcc), despite there being [no shortage in bandwidth](https://money.com/internet-data-caps-bogus-ploys/). If you live in a country that has poor internet service, like the United States, spending a few MB to load a couple paragraphs of text might seem preposterous. But a couple MB is not that much for well functioning internet infrastructure to handle!

Now, whether bandwidth will fix the problem of the web being slow is not a simple question. Decompressing, parsing, and compiling Javascript is certainly a large bottleneck for many websites, and one that more bandwidth and faster connection speeds won't fix. But in focusing on bundle sizes as a foremost consideration, I can't help but feel that people are taking broken infrastructure for granted, without examining the root causes of that infrastructure failure (both [in the United States](https://en.wikipedia.org/wiki/Monopoly) and [abroad](https://en.wikipedia.org/wiki/Neocolonialism)
@sidenote: I've focused primarily on the United States in this post, since that's the area that I know the best. Fixing these problems in other countries seems much more complex, but I think that focusing on bundle size as the primary driver of apps being inaccessible in areas like Africa is ignoring the realities of things like translation and differences in payment infrastructure. At the very least, if you're aiming to decrease bundle size to make your website more accessible in another region, you should be doing that because you've talked to potential users in that region and determined that bundle size is an obstacle, rather than using the region as a justification for decreasing bundle size.
). I don't want to say that people shouldn't focus on bundle size — certainly, many people are excluded from using most of the web today, by the combination of large websites and slow connections, and I applaud attempts to improve that. But we should remember that it's more than a failure of personal responsibility among web developers that causes this — there's also a failure of governments to treat internet infrastructure with the importance it deserves.
