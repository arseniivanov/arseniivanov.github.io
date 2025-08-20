# The metric misalignment in (Computer Graphics) compression research

What is a metric? A metric is a social contract, a standardized, objective way to measure progress by assessing the quality of a creation against a baseline.
Metrics provide a low-dimensional, easy to understand point of trust between people without requiring full explanation of underlying techniques, essentially defining what "better" means in a specific context.

With the introduction of neural networks into various compression subfields, we run into an issue with metrics. The networks produce plausible, perceptually convincing, albeit not pixel-perfect results.
What is the goal in such a world? Is it still perfect replication? How do you judge if a method is better than another? Is this type of information compression different from a traditional compression? If yes, when is it applicable?
 
---
### Compression

After doing research with neural compression for computer graphics for half a year, I have found that this paradigm causes a misalignment with how traditional graphics research metrics are done, and how the newer neural variants fit into this.

In computer graphics research, its been well-established since many years that MSE/PSNR are standard relevant metrics, they are expected in any computer graphics paper visual comparison/compression paper. These metrics look at the absolute difference between every pixel in the target and the original. Optimizing a neural network for such a metric can yield a blurry result, as the network is trying its best to find an average that satisfies most pixels at the same time.

Because of this, in the last decade, these losses have been joined by more perceptual loss metrics, such as SSIM, LPIPS and FLIP, that aim to focus more on more human perceptually relevant areas of the image, such as edges and details that the human brain is more sensitive to compared to a slight shift in the hue of the image.

This is a step in the right direction, however its in my opinion still misguided. As we start seeing more neural networks in computer graphics that yield perceptually good compression solutions, or in general when compressing/optimizing for perceptual metrics beyond the first order features (edges), we are inherently placed in a new paradigm. The output will now no longer be 1:1 aligned with the original. Some noise or features might be slightly shifted or transformed to be compressed better, while still looking realistic and similar to the original.

However, when living in the frame of reference where we are expected to compare something to a ground truth, it will always look unfaithful and give poor metric numbers, albeit realistic.

---
### What are the current solutions to this?

Currently, the solution for researchers in the field is to go through all kinds of metrics, find one that does better for your specific output, put it in **bold** with an arrow in the right direction next to your output, and then confabulate something in the discussion on why you chose your metric and why its better for the task.

Another common, ethically questionable solution is to make the reference implementation look worse so that your comparison is inherently better and has less to live up to. This is of course also misguided in its frame of reference.

Somehow, the community either needs to let go of the 1:1 original replication expectation, or of the metric-based focus if they want to keep improving on rendering speed and size into the new neural paradigms.

---
### Possible ways forward

1) Another new metric. A temporary solution for a new paradigm is to introduce more metrics. This will give some researcher some clout, keep the reviewers happy with the **bold** better number, and kick the can down the road a bit. Some stable diffusion papers have for example introduced pixel color distribution-based metrics, some have introduced first-and-second order feature distribution-based metrics. Personally, I feel like this again is misguided and draws more confusion into the field.
2) Vibe-based evaluation. Traditionally called user-studies, your send out examples of your output and some other compression method output to a handful of people and ask them to specify which image they think looks better. This is becoming acommon as a way to evaluate complex models, such as LLMs. For example, [Artificial Analysis](https://artificialanalysis.ai/text-to-image/arena)  provides a live score leaderboard, where you can vote for the best visual output from two models without knowing which model created what. [LMArena](https://lmarena.ai/) similarly allows the user to get answer from multiple chat models and select the best one, improving that model's score. In this way, each model gets a competitive rating when they beat another model on some task. It would be reasonable to create Computer Graphics-based leaderboards, that have some kind of selection of competetions, target size metric and would allow researchers and companies to compare neural rendering algorithms, compress images to specific sizes using their method, and then have people vote on the best looking reconstruction.
   This is of course a monumental task, there are a lot of questions on what to allow, what categories to use, are we looking to exploit inter-channel information, or specific textures only), what hardware to use, what programming languages to use, is the decompression framework bytesize included in the total size, etc? 
   For example you can have a neural network completely encode an image completely inside its representational space, and then use long, complex decompression schemes to perfectly reconstruct the output. The [Hutter Prize](http://prize.hutter1.net/) solves this issue by constraining the compression to a snapshot of Wikipedia, and the decompression to a laptop with a certain hardware, and a certain time window.
   Here, the computer graphics community can take inspiration from the image compression community, and create something akin to this is being done by the [CLIC](https://clic2025.compression.cc/) - Challenge for image compression.
3) Do not provide the original reference visually in the paper. By only providing your output, you are giving the reviewers a chance to judge it as-is, this is however a massive culture misalignment, and its unclear if your paper would ever be accepted or recognized without a baseline with today's expectations.

As you might notice, I am all for solution 2), as this preserves the 1:1 compression space for the researchers interested in that kind of visual fidelity, and allows various new techniques to be compared holistically without forcing researchers to massage their metrics for their specific use-case, which honestly is a waste of everyone's time.

In general, challenges/competitions like this have had massive impacts to their respective fields. The [ImageNet](https://www.image-net.org/) challenge proved that deep CNN-based models outperform traditional CV techniques back in 2012, and was in many ways responsible for showcasing GPU's power to train deep neural networks, which has led to the current paradigm of LLMs we have today.

I am really hoping to see if someone will take the challenge on creating something like that in the coming years, as I believe that this will provide the right incentives to researchers to progress in the field.
