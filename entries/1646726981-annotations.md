---
{
	"timezone": "Asia/Taipei",
	"location": "Taipei, Taiwan"
}
---
# Annotations

I finally signed up for [Hypothesis](https://hypothes.is) — a tool that lets you annotate arbitrary web pages. I have pretty mixed feelings about it, so far.

I really like the idea — I think annotation is often a useful way of taking notes and discussing ideas. The implementation, though, leaves me a bit confused.

The main problem, for me, is confusion around who the audience for an annotation is supposed to be. Hypothesis doesn't seem to have any concept of "following" or even "blocking"
@sidenote: In general, I'm pretty astonished about the lack of thought Hypothesis seems to have put into abuse and harassment. Genius, who did basically the same thing as Hypothesis, was [rightfully](https://elladawson.com/2016/03/25/how-news-genius-silences-writers/) [dragged](https://www.vijithassar.com/2641/how-to-block-genius-annotations) years ago for providing this same type of tool with no ability for authors to opt-out. Despite that, Hypothesis seems to have built the exact same thing, without any tools to mitigate these concerns.
users, so the answer seems to be that notes are for… whoever happens to go to the same URL you're at and also has the Hypothesis extension installed. Who is that? I have literally no idea.

I've found that this lack of a specific audience makes it very easy for me to lean into being unnecessarily mean — in many other forums, I expect that the author might read my comments, and temper them with that in mind. That doesn't mean holding back my disagreements, it just means phrasing them constructively. Since my default assumption about Hypothesis is that the author won't see the annotations,
@sidenote: This isn't true on webpages where the author has explicitly enabled annotations by including the Hypothesis script on their website, but that seems to be pretty rare.
and probably *nobody* will see my annotations, I'm less likely to be kind in my writing. The problem is, it is actually quite easy for authors to see annotations — certainly one of the first things I did when I was playing with Hypothesis was [searching for annotations on my work](https://hypothes.is/search?q=wesleyac.com).

There's also a more subtle force pushing my annotations to be less kind than my writing in other mediums: since annotations are inline, they're organized to respond to specific snippets of text, without good ways to discuss the larger context of the piece. When I write a response to something someone has written, I generally start by stating my overall position on the piece I'm responding to: often I think that a piece is largely good and important, but I disagree with a specific, small part. When I write about the piece as a whole, it's natural to start by saying that, and laying out my relationship to the text I'm responding to. When I annotate, though, my instinct is to simply highlight the part that I disagree with, write about what's wrong with it, and move on.

I could perhaps counteract that by trying to highlight and annotate more sections that I agree with, but I think that annotation as a primary mode of response makes it much harder to talk about some of the things I love most about writing: I often read pieces that don't have any particular sentences that make punchy sound bites, but still masterfully discuss a topic by making insightful connections between disparate ideas. Responding to those kinds of pieces fundamentally involves summarization and rewording, which is hard to shoehorn into a tool for annotation.

The sum result of this is that Hypothesis makes it easy for me to snarkily respond to individual ideas I disagree with, while making it hard to do the sort of analysis I like on writing that I agree with and think is important. That's a particularly poor property to have in a system with a single public channel and no way for people to control who they see annotations from.

The likely reason that Hypothesis evolved like this seem pretty clear to me: a core piece of what they're trying to build is "social" annotation, and that requires users interacting with each other. They don't have many users right now, and typical Silicon Valley thinking about "social" apps is that they live or die based on the network effects of the number of users they have. Presumably Hypothesis is worried about being seen as a ghost town — from that lens, building tools to let people *avoid* seeing each other's annotations is the opposite of what they want.

The problem is, Silicon Valley thinking about "network effects" around social apps has always been destructive and wrong. You need network effects and a large userbase to make a social app that's worth a billion dollars, but pursuing those strategies is actively harmful to making a social app that makes its users happy. Most people don't want to talk to the entire internet, they want to talk to a few people who they vibe with. Getting the entire internet to use your app usually seems to make it *harder* to find the small set of people you vibe with, not easier — especially when tools for curating community and letting people choose who they interact with are tacked on as an afterthought, rather than built in from the start.

I'd much prefer a version of Hypothesis centered around public groups
@sidenote: Hypothesis has private groups, but those are only useful in very specific contexts, and suffer actual network effect problems, since they have to be organized out-of-band.
that one could subscribe to, with thoughtful moderation and community-building tools built in from the start. I'd love to be able to create and subscribe to a group for [Recursers](https://www.recurse.com/scout/click?t=288aaf8d6ddfba372520ec10690a1e1b) to annotate and comment on things they read, or to be able to automatically follow everyone I follow on Twitter or via RSS on Hypothesis. Shoving everything into a single public group with no way to filter what I see is exactly the opposite of what I want from a piece of software designed to be "social".
