# AMD MI355X 1.1M$ Competition Takeaways

AMD recently launched a staggering **1.1M$** competition to make some DNN kernels run faster on MI355x GPUs. Sadly, because I had some university commitments with prolonged travel to Singapore, I was not able to participate fully, however, I did try out the various techniques, and made a competitive solution using Triton kernels for the MXFP4 GEMM part of this competition. Part 1 of the competition (optimizing kernels) is done, and the second part is now starting for the winners (integrating kernels into inference serving libraries).

I have been following the competition chats, and this competition is arguably the first one where AI-generated GPU kernels have started to dominate the scene. Looking at the top 10 of each leaderboard, more than half of the winning submissions are generated. Some of the winners have admitted in discord that they have **no idea** what their kernels are doing, and that they don't have a background in kernel development, yet they are sitting 10'000$ richer with a potential for a million dollars while others are not, so they are clearly doing something right. In previous competitions from last year, we have sometimes seen kernel names like **submission_21.py**. Looking at the submissions, we can see entries on the format **submission_v2547.py**.

This blog will be split in multiple parts, part-philosophical part-technical. First, we will talk about what makes GPU kernel generation a good task for LLM agents, then we will go into the future of GPU kernel development, then we will touch upon the AMD software ecosystem through the lens of this competition, and finally there will be a small worklog that shows how I improved the baseline AMD implementation, making my solution **1.61x** faster using Triton, and what was missing from the winning **1.90x** improvement.

---
## Kernel development as an AI-Agent task

AI-Agents has been the main talk of 2025 and still so going into 2026 with software like OpenClaw taking the world by storm. With all of this hype, it's sometimes good to stop and consider what value things are actually providing in order to discern tools from toys. Sometimes, hype is being propagated for reasons that are non-practical in reality, such as increasing token and LLM use to recoup some of the massive investments into the models. Sometimes, the task becomes about moving complexity from one domain to the other. Users can champion that their agents are answering their mails and planning their days, but they have essentially moved the complexity/time from the actual planning to instead spending time to add guardrails and set up servers for their agents to run. It's worth to note that this can feel genuinely liberating without necessary providing a benefit in time, because the excitement for the emerging area beats the daily routine of meal-planning and logistics.

I want to argue that GPU kernel inference is an area where the agents can actually provide value in under certain constraints as seen in this competition. Here are the main reasons for why I think so:
#### Clear optimization objective
GPU kernel runs give you a clear objective to improve. There is no ambiguity on whether you like 12us or 10us more. Contrast this to whether your agent should give you a fish or a lentil recipe today.
#### Task homogeneity
LLMs excel in areas where they are a good data distribution. In the context of LLMs, the architectures are very, very similar. Look at Sebastian Raschka's [visualizations](https://sebastianraschka.com/llm-architecture-gallery/) of the LLM architectures, in 3 years, the largest changes we have had is a simplification of the normalization, addition of [flash linear attention](https://github.com/fla-org/flash-linear-attention) blocks and a slow creep down into lower precision formats. 

Every time there is an inference optimization competition, the focus is on similar tasks - FP4, GEMM, MLA, MoE. The data distribution for these problems is growing the fastest because it's the most in-demand bang-for-your-buck optimization that you can make to your serving libraries. This has improved the data distribution for the models on these tasks, and they are able to perform much better when asked to translate them to a different hardware for example.
#### Task complexity
GPU kernel development is a highly non-linear optimization task. Any change you make in one end of the system might impact a completely unrelated part of the same system, causing things to improve or break. We saw this in my previous blog on NVIDIA GB200 programming competition. Adding 2CTA only yielded improvements when some other part of system like the epilogue was changed in unison as the register pressure went down and allowed for 2CTA to yield improvements.

At the same time, you have a massive system where you do not control all the things. You have data movement, under-the-hood workload scheduling, workload kernels, and throw distributed systems in there, as well as a training backwards pass and you are knee-deep into interacting components. The interactions between all components yields a combinatoric explosion that you cannot grid-search or Bayesian-optimize over.

This causes the evolutionary-like approach of LLM agents to be a good candidate. You can feed in context like profiling outputs, and utilize the vast knowledge of prior GPU resources, such as user blog worklogs, to spot sparse patterns among the sea of options to test. Essentially it's a higher-order hill climbing/optimization.

The whole setup above draws very close parallels to Andrey Karpathy's [autoresearch](https://github.com/karpathy/autoresearch), where models are sweeping various parameter spaces and configurations to improve the training loss of the tiny toy network(wide search space, clear optimization target, good model data distribution on ML-optimization).

---
### Pitfalls and harnesses for Agentic GPU kernel development
So, will GPU kernel devs be fired and have their salaries slashed in half based on this? Probably not immediately. There are some issues with this approach as well.
#### Reward hacking
The AMD competition was also, because of the agent use, bombarded with various reward hacks. Deep-Reinforce made a really good [blogpost](https://deep-reinforce.com/defense_kernel_hack.html) on various ways models can reward-hack, and Wafer has followed up with a very similar list. There has also been GPUMODE-eval-specific hacks that popped up, [in this blog](https://www.gpumode.com/news/reward-hacking-nvfp4) the authors found that the models exploiting the specific harness created for the competition. The model figured out that it could compute all of the evaluation problems in a single big kernel, and then in subsequent launches just point to and return the output, thus avoiding overhead from launching kernels per-problem. 

The competition mitigated this issue by initially asking users to verify their own solutions, or running them through LLM models that have as a sole task to spot reward-hacking, but later on prompted to add their own LLM in the backend to check for reward-hacks.
Despite this, there are still some reward-hacked solutions on the leaderboard that slipped through that had to be manually verified by the judges.

This will be an eternal cat-and-mouse game. It will be up to the competition and event organizers to try to define their targets, sandbox their evaluation to the extent where solutions utilizing Agent-descent are able to provide value with the least amount of damage.
Outside of GPU programming, a [recent paper/blog](https://rdi.berkeley.edu/blog/trustworthy-benchmarks-cont/) from Berkeley showed that some common LLM evaluations such as SWE-Bench and TerminalBench are completely hackable, some in easier ways, some in harder using various exploits of the harness. They also mention that [Claude 3.7 and OpenAI o3 did show rewardhacking](https://metr.org/blog/2025-06-05-recent-reward-hacking/), and in the best/worst way possible, where the result seems right, not going full 100%, but for example increasing performance by some fractional percentage from the previous best model.

Future GPU kernel devs will probably have to know how to set up harnesses and informational environments for their specific tasks in order to not fall victims for this.
#### Maintainability
This is possibly a non-problem, but the generated best kernels are often a potpurri of various libraries, calls and imports. We can see the top MoE solution import and use both existing AITER and FLYDSL kernels, second place uses AITER, HIP and Triton. We need to get to about positions 5-8 of the Top 10 until we reach in **my opinion** a portable, clean solution.

However, perhaps this is the inevitable future of kernel development. The variables will grow so different (size of your inference cluster, your hardware age/quality, your software stacks, your serving requirements) that kernels will be generated and optimized in this manner for a specific setup and then remade when necessary.
#### Out-of-distribution examples
This is left to see, but it's very possible that if let's say FLA or Diffusion transformers end up winning, they might not have as good representation in the datasets that the causal attention, KV-caching or sparse attention has, the agents might get stuck and not be able to proceed. There is a slight indication of this in this competition, with the winner of 2 of the leaderboards ending up in 16th place after 1777 submissions on the more complex MoE task. This is of course always a question of time and data distribution. Soon the MoE kernel generation will be better, then the next thing, and so on.
#### Roofline performance and gambling
Using the MoE kernel above as an example, the user could probably be really frustrated with the performance, but they would be in a state where they cannot improve it in any other means than just throwing time and compute at the problem. If they are using the best LLM-models for this task, they are essentially playing a slot machine with tokens. A user that is understanding the problem themselves would perhaps be able to make modifications themselves, or identify other paths/context that could help the model.
#### Disclaimer
Note that my opinion the best solution for a kernel development competition is the one that is the fastest, cheapest and best(some might argue readable and deployable since there is a part 2 for the competition). In general I don't see a problem with using agents in this context. It's easy, especially coming from academia, to get on a high-horse about epistemology and claim that understanding the problem is necessary, but clearly it's not.

---
### The future of GPU kernel development
You can have any opinion on the agents or kernel generation, but it's impossible to deny that they are working for the task at hand. Even the most cudapilled ptxmaxxers will have to accept that they will most likely not one-shot such a complex system, and that they could benefit from iterative refinement by the LLMs.

The question that I think remains interesting to consider here is how much of the mental work should you outsource to the process. Should you create a good-enough starting point for the agents to optimize on? Should you YOLO it completely from the start? Should you have the models documenting their improvements along the way? Should you just look at the final kernel and try to make sense of the thing? Do you need to? 

I chose the first approach, and made Claude Code to improve my final kernel at the end of this blog, it found about 10% more improvements by jugging cache modifiers in some unintuitive way. If I had run it in an agent loop while travelling, perhaps I would have been in the top 10.

The other thing, which is a million dollar question companies such as [Standard Kernel](https://standardkernel.com/), [Wafer](https://www.ycombinator.com/companies/wafer) and other GPU-kernel-generation-companies are trying to construct is how to build the harness and context for the LLMs in question. How do you ensure that the model has access to documentation, prototype kernels in order to aid generation? Is it necessary to provide all of this context, or can they perhaps find all of it online themselves? 
Also, how do you construct an environment and target for a problem that is not easily reward-hacked?

I also think that this is interesting in what this means for AMD software ecosystem. We can see that plenty of the solutions, including mine, are written in Triton. The winning solutions are mostly written in Triton, or calls to existing parts of AITER/FLYDSL. Triton has a much broader data distribution than HIP. LLMs and Agentic models will default to solving the problem with the most commonly used way, which happens to be Triton unless you specifically tell it to do otherwise. Compare this to NVIDIA competitions where there is no way that a Triton solution will get even close to the SOL. All the solutions there are written in CUDA or CuteDSL.
What does this mean for the AMD ecosystem? Perhaps AMD will need to invest in having the best transpilers from GPGPU languages to their backend ISA. How can you close a software moat when the tools that write the code are pushing the users to use more general solutions?

Finally, I think that it's possible to sometimes forget this when participating in competitions like this, but GPU kernels are a **means to an end**. We are optimizing GPU kernels in order to make tasks like LLMs, or image generation, or some scientific computing run faster. Going full-out and investing everything into learning GPU kernel development in order to get a 300k$ salary will probably not be possible in some years for most of the reasons named earlier in this blog. It's an ideal problem to iterate on with clear objectives. It's arguably harder to make a successful website for a product with LLMs if you think about this from this perspective, because you need to keep in mind how users interact, which is an ambiguous objective. If I have any advice to anyone in the field reading this, it's to think about **what** you are optimizing over the optimization itself. GPU kernels are a fantastic toolkit, but they will not be the bottleneck for most problems.

---
## MXFP4 GEMM Kernel Worklog

I had some time to optimize the MXFP4 GPU kernel. First, I created various baselines for the various languages to explore the AMD ecosystem. The AITER reference was winning, but a naive Triton kernel was not far behind. Since I know Triton, I decided to go on the route of improving that.

Pytorch eager:  
⚡ 499 µs 🐌 856 µs  
⚡ 1151 µs 🐌 1280 µs  
⚡ 510 µs 🐌 1054 µs  
⚡ 482 µs 🐌 1442 µs  
⚡ 1124 µs 🐌 1370 µs  
⚡ 621 µs 🐌 1008 µs  

Pytorch compile:  
⚡ 26.6 µs 🐌 32.0 µs  
⚡ 198 µs 🐌 219 µs  
⚡ 61.8 µs 🐌 69.4 µs  
⚡ 56.3 µs 🐌 62.6 µs  
⚡ 199 µs 🐌 216 µs  
⚡ 106 µs 🐌 116 µs  

Triton kernel naive:  
⚡ 12.6 µs 🐌 18.5 µs  
⚡ 40.9 µs 🐌 45.4 µs  
⚡ 13.0 µs 🐌 18.8 µs  
⚡ 13.0 µs 🐌 18.2 µs  
⚡ 28.6 µs 🐌 34.0 µs  
⚡ 18.8 µs 🐌 25.8 µs  

FlyDSL:  
⚡ 550 µs 🐌 984 µs  
⚡ 608 µs 🐌 1059 µs  
⚡ 561 µs 🐌 973 µs  
⚡ 554 µs 🐌 2.40 ms  
⚡ 566 µs 🐌 1079 µs  
⚡ 601 µs 🐌 973 µs  

Initial AITER reference kernel:  
**⚡ 11.1 µs 🐌 17.2 µs**  
**⚡ 24.3 µs 🐌 31.2 µs**  
**⚡ 11.4 µs 🐌 16.8 µs**  
**⚡ 11.4 µs 🐌 16.5 µs**   
**⚡ 13.4 µs 🐌 18.8 µs**   
**⚡ 12.1 µs 🐌 16.8 µs**   

---

In order to improve the Triton solution, we look at what the best solution does. The aiter solution runs the **aiter.get_triton_quant** on A, which if we follow into the library maps to a MXFP4 Triton kernel in the aiter backend. This means that we are launching 2 kernels at least with this solution. In order to improve things, we simply copy out the quant_func from the lib and fuse it into the kernel loop, this gives us much faster kernels for small Ks, beating aiter on those shapes.

Triton kernel no aiter:  
**⚡ 6.80 µs 🐌 12.2 µs**  
⚡ 45.2 µs 🐌 50.9 µs   
**⚡ 6.80 µs 🐌 12.8 µs**  
**⚡ 6.96 µs 🐌 12.8 µs**   
⚡ 16.8 µs 🐌 22.3 µs  
⚡ 14.5 µs 🐌 20.4 µs  

Since we only see improvements on small kernels, we do a Split-K with a non-atomic reduction to see if kernel with big K can benefit from this (we can). After experimenting a bit with the amount of splits for various Ks we see that one kernel in particular benefits a lot from this. We now have 4 entries better than the initial aiter kernel.

⚡ 6.64 µs 🐌 12.6 µs  
**⚡ 13.0 µs 🐌 18.2 µs**  < Split-K = 16  
⚡ 7.00 µs 🐌 12.5 µs  
⚡ 6.76 µs 🐌 12.5 µs  
**⚡ 15.6 µs 🐌 22.4 µs** < Split-K = 2  
⚡ 14.3 µs 🐌 19.7 µs  

#### Sidenote Split-K
Split-K is a technique where we split the workload across the SM's(or the AMD Compute Units(CU)) along the K-dimension. Each unit will then load the A and B matrices, but only work on a subset of the K-dimension. The result will then be accumulated together, you can do this in 2 ways. Either you use atomic writes to the same workspace, or you allocate a big workspace and then launch a second GPU kernel to add all the outputs together. In ALL competitions I have done so far, the allocate + reduce approach has been faster. The reason for this (except for hardware quirks), has been that the output has always been expected to be in fp16, while the accumulation happens in fp32. This means that then we write the atomics, we will need to make atomic FP32 writes, and then have a single SM convert the output to fp16 and return, or launch another kernel to convert to fp16. Instead, writing fp32 values to a big workspace, and then running the reduction kernel that is non-blocking without any atomics can do the reduction and conversion in one go faster.

For workloads where we have a very small A/B and big K, this makes a lot of sense, otherwise we will not saturate the GPU.
#### end sidenote

We add EVEN-based loads similar to the aiter Triton reference. This means that we check in every kernel launch if the config is divisible by itself on M, N and K, and if it is, we can skip masking the load, which skips branch checks and makes things more efficient. We get marginal improvements for some shapes that have this property:  

```python
if EVEN_M and EVEN_K:
	a = tl.load(a_ptrs)
elif EVEN_K:
	a = tl.load(a_ptrs, mask=mask_m[:, None], other=0.0)
else:
    k_mask = (k_idx * BLOCK_K + offs_k) < K
    a = tl.load(a_ptrs, mask=(mask_m[:, None] & k_mask[None, :]), other=0.0)
```


⚡ 6.72 µs 🐌 11.5 µs  
⚡ 13.0 µs 🐌 18.2 µs   
⚡ 7.00 µs 🐌 12.5 µs  
**⚡ 6.72 µs 🐌 11.6 µs**  
**⚡ 13.9 µs 🐌 19.4 µs**  
⚡ 14.3 µs 🐌 19.7 µs  

We adjust the autotuning configs and find that M=16 is necessary for all the best performance, we also find some slightly better configs. We see that we are reaching AITER performance on the 5th shape as well which is good news.

**⚡ 6.28 µs 🐌 12.0 µs**  
**⚡ 12.6 µs 🐌 18.0 µs**  
**⚡ 6.28 µs 🐌 11.9 µs**  
**⚡ 6.16 µs 🐌 11.9 µs**  
**⚡ 13.4 µs 🐌 19.0 µs**  
**⚡ 12.8 µs 🐌 18.2 µs**  

We let Claude Sonnet 4.6 run in an agentic loop that does a comprehensive heuristic mapping for various things like cache modifiers, shuffling of B-matrix, B-matrix eviction policies, cache-write-through behavior depending on the shapes. This collects all of the various improvements and fixes for each shape. We end up with a performance of:

**⚡ 5.96 µs 🐌 11.7 µs**   
**⚡ 10.2 µs 🐌 15.9 µs**  
**⚡ 5.92 µs 🐌 11.3 µs**  
**⚡ 5.88 µs 🐌 11.4 µs**  
**⚡ 13.1 µs 🐌 19.3 µs**   
**⚡ 11.3 µs 🐌 16.9 µs**  

In the end, my solution is strictly better than the reference AITER solution, which I am proud of.

This demonstrates the power of the agentic solutions for this task. The agents are acting as a relentless hill-climber, being able to optimize from a systems perspective in ways you might not have thought of.

---
### Further improvement
When looking at the top solutions that beat mine, I can see a clear thing that I missed. I utilized a Triton-based software dequantization from fp32 to fp4. However, it appears that the AMD MI355X has software to do this efficiently in hardware by inlining assembly. My solution looks like this:
```python
@triton.jit
def inline_quantize_mxfp4_optimized(x, BLOCK_SIZE_M: tl.constexpr, BLOCK_SIZE_K: tl.constexpr):
    x_reshaped = tl.reshape(x, [BLOCK_SIZE_M, BLOCK_SIZE_K // 32, 32])

    x_abs = tl.abs(x_reshaped)
    amax = tl.max(x_abs, axis=2)
    
    x_u32 = x_reshaped.to(tl.uint32, bitcast=True)
    sign = x_u32 & 0x80000000

    amax_bits = amax.to(tl.uint32, bitcast=True)
    amax_rounded = ((amax_bits + 0x200000) & 0xFF800000)
    exp_biased = (amax_rounded >> 23).to(tl.int32)
    scale_unbiased = tl.minimum(tl.maximum(exp_biased - 129, -127), 127)
    quant_scale_bits = ((127 - scale_unbiased).to(tl.uint32) << 23)
    quant_scale = quant_scale_bits.to(tl.float32, bitcast=True)

    qx_abs = x_abs * tl.expand_dims(quant_scale, 2)

    denorm_val = ((qx_abs + 4194304.0).to(tl.int32, bitcast=True) - 0x4A800000)
    norm_bits = qx_abs.to(tl.int32, bitcast=True)
    mant_lsb = (norm_bits >> 22) & 1
    norm_val = ((norm_bits - 1054867457 + mant_lsb) >> 22)

    e2m1 = tl.where(qx_abs < 1.0, denorm_val, norm_val)
    e2m1 = tl.where(qx_abs >= 6.0, 7, e2m1)
    
    e2m1_packed = ((sign >> 28).to(tl.int32) | e2m1).to(tl.uint8)
    e2m1_pairs = tl.reshape(e2m1_packed, [BLOCK_SIZE_M, BLOCK_SIZE_K // 2, 2])
    evens, odds = tl.split(e2m1_pairs)
    x_fp4 = evens | (odds << 4)

    bs_e8m0 = (scale_unbiased + 127).to(tl.uint8)
    return x_fp4, bs_e8m0
```

The winning submission had this helper function:
```python
@triton.jit
def _hw_fp4_convert_pair(val0, val1, scale):
"""Convert 2 FP32 values to packed FP4 byte using hardware instruction.
CK-style: no v_mov_b32, "=v" output constraint, VGPR scale.
"""
return tl.inline_asm_elementwise(
"v_cvt_scalef32_pk_fp4_f32 $0, $1, $2, $3",
"=v,v,v,v",
[val0, val1, scale],
dtype=tl.int32,
is_pure=True,
pack=1,
)
```
That replaces most of e2m1 work at the end of our kernel and explains most of the difference from the winning solution.
The agentic solution probably fished this out from the [CDNA4 ISA spec](https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/instruction-set-architectures/amd-instinct-cdna4-instruction-set-architecture.pdf).

All kernels can be found at:
https://github.com/arseniivanov/amd_mxfp4_gemm
