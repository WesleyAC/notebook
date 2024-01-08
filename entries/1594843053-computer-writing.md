---
{
	"timezone": "EST",
	"location": "Brooklyn, New York"
}
---
# Computer Writing

Every time I open a thesaurus, I'm disappointed. So often, I have some word or phrase that is almost there but feels *just off* — but when I look in a thesaurus, every option is a watered-down version of the words already in my head. Thesauruses were the best we had a few decades ago, but can make better tools now. Let's start building them.

Recent machine learning research seems to fetishize replacing humans — when people talk about GPT-3, they rave about how human-like it is, how having a conversation with it feels so natural, how it can make arguments even better than the ones it was seeded with. I don't buy it.
@sidenote: Note that when I say this, I have not yet played with GPT-3, I've only seen text that other people have produced with it. If you want to give me access to prove me wrong, feel free to email <a href="mailto:me@wesleyac.com">me@wesleyac.com</a> :)
GPT-3 is impressive, but it still sounds like fluff: all the structure of good arguments without any of the meaning.

If not GPT-3, what am I excited by?

I think that there's a huge amount of untapped potential in using word2vec embeddings to build tools for writers.

<figure class="fullwidth">
<img src="/img/post/computer-writing/word2vec_monsters.png" alt="A screenshot of a cloud of points, each representing a word. The word 'monsters' is selected, and similar points are highlighted, including 'wolf', 'super', 'vampire', 'frankenstein', 'fantasy', 'gods', 'evil', 'films', 'creatures', and 'beings'."/>
<figcaption>
<a href="https://projector.tensorflow.org/">A tool for exploring word2vec embeddings</a>.
</figcaption>
</figure>

The key word here is "tools" — **I'm not interested in automating writing, I'm interested in building a better thesaurus.**

This idea took root in my brain after seeing the <a href="https://p.migdal.pl/2017/01/06/king-man-woman-queen-why.html">classic "king − man + woman = queen" demo</a>. That example is too simple to be useful, but the idea stuck with me: if I want to find a word that's like the one I have, but has slightly different connotations, can word2vec or similar tools help me?

@marginnote-mobilehide: <img src="/img/post/computer-writing/metaphoria.png" alt="A screenshot of Metaphoria displaying possible metaphors relating the concept of love to windows"/> *[Metaphoria: An Algorithmic Companion for Metaphor Creation](http://language-play.com/metaphoria/)*

It feels sort of silly to be excited about a model that came out almost a decade ago, but so far, every time I've seen a new natural language processing model come out, **I only see demos, and never any actual tools for writers.** This makes a sort of sense — demos are exciting, putting in the effort to build useful tools isn't — but it does make me a bit sad.

I have seen a few tools that are close to what I want, but nothing so impressive as to become a regular part of my writing practice in the way that one would expect a thesaurus to be.

[Metaphoria](http://language-play.com/metaphoria/) is a tool by [Katy Ilonka Gero](http://www.katygero.com/) that uses [ConceptNet](https://conceptnet.io/) to assist in searching for metaphors. [Glad Glyphs](https://web.archive.org/web/20221128013726/https://glad-glyphs.herokuapp.com/) is an "alliteration accessory" by [Anna Leuchtenberger](https://annaanna.net/) that uses synonym lists to propose alliterations. These are both useful, but I can't help but feel that the space of algorithmic tools for writers is underexplored. I want to go beyond alliterations and metaphors, to have tools for every nook and cranny of the writing process. We have the technology. All we need to do is leave behind our obsessions with AI replacing human writing, and start building tools that let us collaborate with machines to find ideas we didn't know we had.
