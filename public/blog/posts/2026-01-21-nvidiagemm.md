# NVIDIA GB200 GPU Programming Challenge

Last year in November NVIDIA sponsored a large GPU Programming competition on the GPUMODE server. The vibe of the competition was quickly understood to be common problems (GEMV, GEMM), but with small workload shapes/small batches, and with NVFP4 + NVFP8 numerical formats.

Currently there has been 3 out of 4 problems done, right now there is a Batched GEMM problem going on, so if you are interested feel free to join that by joining the GPUMODE Discord!

These competitions have been my first contact with the CuteDSL NVIDIA programming abstraction. CuteDSL is a way to write CUTLASS in Python. While I am much more comfortable with Triton, a more NVIDIA-native language is necessary to compete for the top positions. CuteDSL is a way for NVIDIA to structure their code for ML workloads in a more constrained but at the same time maintainable format. It's possible to look at top submissions in the competition from both pure CUDA/PTX and from CuteDSL, and I would argue that the latter ones are more readable.

You can see my proficiency with CuteDSL increasing as we go through my leaderboard rankings at the end of each problem deadline, feel free to check out the full rankings at:
https://www.gpumode.com/v2/home

NVFP4 Batched GEMV - **60th**  
NVFP4 GEMM - **15th**  
NVFP4 Gated Dual GEMM - **4th**  
NVFP4 Grouped GEMM - **Ongoing**  

In order to not lose your attention, I want to structure this blog with first having the main takeaways I have learned from participating about the B200, CuteDSL, Async scheduling, and about the future of computing, and then for the interested reader including the worklogs for each of the 3 problems I have solved so far.

# Takeaways

1 - **Hardware is developing faster than compilers**. This was also mentioned by Charles Frye from Modal during [his talk on GPUMODE](https://www.youtube.com/watch?v=VPslgC9piIw). We find during multiple situations in the competition that inlining simple PTX for things like bitcasts or epilogues increases performance dramatically, leading to the conclusion that the compilers are not there yet to generate efficient code even when it's for 5-line PTX workflows. At the same time you have the next Rubin architecture coming out in a couple of months, which will introduce it's own new optimization and scheduling paradigms. This means that there will be tremendous value in understanding GPU patterns yourself if you want the best performance out of the hardware.
We also see that the best solutions do crazy memory pipelining for problem specifics that I personally believe are very hard to infer from templates in a compiler(more on this in point 2).

2 - **Scheduling >> Compute**. During the problems, we have situations where we are performing GEMM on tensor cores, and then doing epilogues(element-wise operation after matrix multiplication). Even if the epilogue is really simple, if there are any data dependencies between any parts, you are going to freeze up the whole pipeline while waiting for the data from the GEMMs. We learn that sometimes makes more sense to introduce redundant memory movement, but to ensure that there is work being done on the GPU 24/7. For example, in the winning solution for the latest problem, the user **guaguabear** realizes that the SwiGLU operation swish(gemm1(x)) * gemm2(x), despite using the same X-input, can be decoupled. 

We can start the MMA by doing:

Loop:  
A -> TMEM  
B1 -> TMEM  
B2-> TMEM  
GEMM1(A, B1)  
GEMM2(A, B2)  

But when we reach the end of the K-dimension for the workloads, it becomes faster to do:

Loop:  
A -> TMEM  
B1 -> TMEM  
GEMM1(A, B1)  

Loop:  
A -> TMEM  
B2 -> TMEM  
GEMM2(A, B2)  

This is because the epilogue is able to use the output from GEMM1 to compute the expensive SFU-based tanh/exp while GEMM2 is finishing up. Too big tail and the duplicated A -> TMEM loads become not worth it, too small/no tail and GEMM2 will sit idle in memory stalled waiting for the GEMM1 epilogue to finish.

This optimization can be hard to see, I for example wrote a small PTX epilogue such as:
```python
    asm_str = """
    {
        .reg .f32 %half_g0, %half_g1;
        .reg .f32 %tanh_in1;
        .reg .f32 %tanh0, %tanh1;
        .reg .f32 %res0, %res1; 

        mul.f32 %half_g0, $1, 0.5;
        mul.f32 %half_g1, $2, 0.5;

        // additive bias to fix single precision error
        add.f32 %tanh_in1, %half_g1, 0.0002;

        tanh.approx.f32 %tanh0, %half_g0;
        tanh.approx.f32 %tanh1, %tanh_in1;

        fma.rn.f32 %res0, %half_g0, %tanh0, %half_g0;
        fma.rn.f32 %res1, %half_g1, %tanh1, %half_g1;

        mul.f32 %res0, %res0, $3;
        mul.f32 %res1, %res1, $4;
        cvt.rn.f16x2.f32 $0, %res1, %res0;
    }
    """
```

That I thought was efficient, we work on 2 elements at the same time, and directly return fp16 to be written to SMEM. However it turns out that splitting this up was much better in terms of latency hiding and less waiting.

3 - **Branching, multi-solution code is necessary for GPU optimization**. This is personally a tricky one for me. In general, I like code that is readable and structured, I want to follow along, imagine what transforms the shapes undergo. It sucks to have a bunch of if-statements that branch on things like 2CTA, epilogue tile size, overlapping accumulators and such. However, the compiler will optimize this out, there is no runtime overhead for leaving things in.

The benefit of leaving it in is that you are able to grid-search over possible solutions. It's REALLY EASY to get stuck in a traditional sequential sciency-abalation-study conditional-independence type of thinking with GPU optimization parameters. You try to change a shape, it gives no speedup, you try to change a cluster size, it gives no speedup, however changing both the shape and cluster size at once gives a speedup, or it doesnt, but making also touching something else unrelated like the epilogue tile in combination with the other changes does.

It would be interesting to see if it's possible to develop some type of dependency graph/diagram with things that can and can't affect each other for the GPU, because currently the best bet to do is that we have full conditional dependence on everything and we need to grid-search it all.

4 - **Profiling tools can't always find your bottlenecks**. While NSIGHT is a godsend for profiling, I found during the competition that once you step anywhere out of just a batched GEMM, the insights might not make sense as optimization directions. For example, NSIGHT will tell you "70% speedup available by using more SMs". However, we know from the problem that we are already on the smallest possible tile size for tensor cores, we can't physically create more work, and doing split-k adds too much overhead and atomic scheduling, so its actually impossible to improve this issue. Another hint says: Coalesce memory loads for better cache performance and 25% speedup. However, this refers to the scale-factors, which in our problem are delivered in a Tensor-core optimal layout format, so we cannot do anything here either. I think the biggest value/improvement I had from NSIGHT for this competition was just staring at the SASS.

5 - **If you want value from LLMs in GPU programming, or agentic GPU LLMs, you need to choose your input data with intent**. At the end of the competitions, I chose to let Gemini look for potential improvements to our code, and I got very different optimization directions based on the data I put in. I tried putting in raw CuteDSL code, raw NSIGHT SASS output, raw NSIGHT SASS **instruction only** outputs. This was also mixed with various information and constraints on what I already have tried. I found that yielded vastly different optimization suggestions. Just copy-pasting the SASS made the LLM hyperfixate on the pipeline stalls, which are inevitable for some parts of our problem (we need to wait for TMA data before we start doing GEMM), but putting in the instructions only actually found redundancies in them and good suggestions. Similarly, providing the whole code made the LLM hyperfixate on 2CTA, Cluster shapes, or other Blackwell-features that are hyped, but putting in small chunks like the PTX block only yielded meaningful optimizations. This section almost deserved a blog-post of it's own. 

---
### Worklogs for each problem:

# GEMV

The first problem is to write an efficient Batched Blockscaled GEMV NVFP4 with FP8 scales.

  You will implement a batched matrix-vector multiplication kernel optimized for NVIDIA B200.
  To be explicit, you will be given a tuple of tensors:
  ```
  (a, b, sfa, sfb, c)
  ```
  where:
  * `a` is M x K x L in K-major order in nvfp4(e2m1)
  * `b` is 1 x K x L in K-major order in nvfp4(e2m1)
  * `sfa` is M x (K // 16) x L in K-major order in fp8(e4m3fnuz)
  * `sfb` is 1 x (K // 16) x L in K-major order in fp8(e4m3fnuz)
  * `c` is M x 1 x L in fp16

The shapes tested for and their speed of light is:

M | K | L | SOL  
7168 16384 1 8.622  
4096 7168  8 17.275  
7168 2048  4 4.317  

Here is a visualization of the problem, we are reducing over K with provided scales:
![[Pasted image 20251113120657.png]]
A single scale/execution slice of this would look like this, with certain tile-size over M:
![[Pasted image 20251113120721.png]]
Right off the bat, we notice that this computation requires some tensor reshape gymnastics because the torch.\_scaled\_mm() requires specific layouts in order to have efficient contiguous scale access.

### PyTorch

We start off with the PyTorch baseline:

⚡ 82.8 µs 🐌 85.0 µs  
⚡ 325 µs 🐌 341 µs  
⚡ 126 µs 🐌 132 µs  

We remove all python overhead and collapse some of the some of the shape operations, adding torch.compile for the shapes that benefit from it:

⚡ 62.5 µs 🐌 66.7 µs  
⚡ 264 µs 🐌 271 µs  
⚡ 101 µs 🐌 110 µs  

### Triton

We then go to Triton and rewrite all of the scale reshapes from to_blocked inside of a single kernel and get:

⚡ 60.4 µs 🐌 62.5 µs  
⚡ 160 µs 🐌 166 µs  
⚡ 57.5 µs 🐌 60.7 µs  

We consider rewriting the scaled_mm together with this kernel, but then we find that some smart people have already tried this, and it performs worse then the existing kernel:
https://gist.github.com/mobicham/3317f78e38ac24773a6c77169710d443

Probably, the torch function is calling some efficient CUTLASS template under the hood.

Here we realize, that we probably will need to go down to the same CUTLASS level in order to achieve any competitive performance. For this, I utilize the CuteDSL, which is a python Cutlass wrapper.

### CuteDSL

We start off with the provided CUTLASS template:

⚡ 233 µs 🐌 241 µs  
⚡ 120 µs 🐌 122 µs  
⚡ 38.8 µs 🐌 41.0 µs  

We see that CUTLASS out of the box outperforms the optimized Triton/PyTorch kernels for the 2 later shapes, however performance is completely tanked for the first shape, looking at the shapes again:

7168 16384 1  
4096 7168  8  
7168 2048  4  

From this, we can learn something about the CUTLASS kernel. It feels like we are much more efficient on smaller shapes, and with batched access.

We increase the K-tile shape dimension to 256(more work per threadgroup) while reducing the threads per threadblock(more independent blocks of threads) and get:

⚡ 144 µs 🐌 148 µs  
⚡ 88.0 µs 🐌 91.1 µs  
⚡ 29.2 µs 🐌 30.9 µs  

I am not seeing how to reduce the first example further to match the Triton example, since shapes are optimized for, I suspect that this slowdown has to do with num_stages and num_warps, so I will start focusing on optimizing the computations and memory ops.

Firstly, we notice this line:

     res += tArA[i] * tArSFA[i] * tBrB[i] * tBrSFB[i]

Multiplication is commutative, so we multiply the scales before we loop over the tiles and avoid a lot of unneccesary multiplications. Simplifying get us:

	for i in cutlass.range_constexpr(mma_tiler_mnk[2]//16):
		acc = cute.zeros_like(tCgC, cutlass.Float32)
		for j in cutlass.range_constexpr(16):
			acc += tArA[i*16 + j] * tBrB[i*16 + j]
		acc *= register_scale[i*16]
		res += acc

⚡ 120 µs 🐌 123 µs  
⚡ 69.6 µs 🐌 74.8 µs  
⚡ 23.5 µs 🐌 26.6 µs  

We then try out different strategies, first one comes from https://veitner.bearblog.dev/nvfp4-gemv-improved/, where the point is to launch a grid over the K-dimension as well, so we dont need to loop over the K-blocks inside of each kernel, this greatly improves the first benchmark that has large K-sizes and gives us:

⚡ 37.7 µs 🐌 42.0 µs  
⚡ 58.2 µs 🐌 62.5 µs  
⚡ 25.5 µs 🐌 29.7 µs  

FP4->FP16 instead of FP4->FP32  
⚡ 35.8 µs 🐌 36.3 µs  
⚡ 52.0 µs 🐌 57.3 µs  
⚡ 23.4 µs 🐌 27.6 µs  

We find that there is no FP8->FP16 LLVM intrinsic and create our own:

    # Process lower 4 bytes (4 fp8 values)
    rst_lo_i32x2 = llvm.inline_asm(
        llvm.StructType.get_literal([T.i32(), T.i32()]),
        [src_lo],
        """{\n\t
            .reg .b16 h0, h1;\n\t
            mov.b32 {h0, h1}, $2;\n\t
            cvt.rn.f16x2.e4m3x2 $0, h0;\n\t
            cvt.rn.f16x2.e4m3x2 $1, h1;\n\t
        }""",
        "=r,=r,r",
    )

Our FP8->FP16 LLVM intrinsic gives us a mini 2us boost.  
⚡ 33.5 µs 🐌 34.0 µs  
⚡ 50.0 µs 🐌 54.4 µs  
⚡ 23.4 µs 🐌 27.6 µs  

We profile this using NSIGHT Compute, and see that some of the issues are: warp stalls from register pressure, unfused ops and uncoalesed access. Our chunking of the solution along K for every thread has lead to an overuse of registers, and the for-loop somehow does not fuse the multiply-accumulate.

I tried some solutions including: SMEM allocation, FMA, smaller blocks for less warp stalls. However, SMEM is unreasonably hard to get right in CuteDSL for some reason.
FMA did not improve performance, and register pressure is lowered if we work with split-K solutions, however, this did not improve the performance either. 

Concluding, I believe the biggest gain would be from loading in matrices A and B into shared memory, as they have uncoalesed accesses along M while being K-major. Loading this would require tiles copies of contiguous Int32s, and a split up to 8 fp4s. This was however tricky to get working, and I did not manage to do it in time.

But we improved the initial kernel by 3-6x, and the Triton kernel by 2x.

---
# GEMM

One of the neat things for the first challenge was since it is different from the others (GEMV is memory bound and CUDA-core instead of tensor-core heavy), we get the winning solutions right
away, and can learn from them. The winner also wrote:

- one of the most important tricks is cache modifier. use `.cs` / `.L2::evict_last` / `.L1::no_allocate` for A. that rules out `cp.async` since there is a PTX/SASS bug (illegal instruction encountered) on B200 when using `cp.async` with cache policy.

Apart from this, we have good winning solutions that we can learn from.

  M   N    K   L time[us]  
  128 7168 16384 1 8.994  
  128 4096 7168  1 2.354  
  128 7168 2048  1 1.333  

### CuteDSL
We start off with the CuteDSL baseline(that was the reference for this problem):
⚡ 146 µs 🐌 151 µs  
⚡ 80.8 µs 🐌 83.1 µs  
⚡ 60.4 µs 🐌 62.7 µs  
## Triton
After seeing successful Triton solutions from other contestants in the previous challenge, I decided to start with Triton in this challenge, there seems to be a lot to gain for a very small mental overhead, so we adjust the best Triton example to be a GEMM instead of a GEMV from the last competition and get a really good 4x jump.

⚡ 34.1 µs 🐌 34.5 µs  
⚡ 18.5 µs 🐌 18.6 µs  
⚡ 10.3 µs 🐌 10.3 µs  

We adjust the K-size for better occupancy and remove the batch dimension in order to simplify various transforms/stride computations and get:

⚡ 26.3 µs 🐌 26.4 µs  
⚡ 14.6 µs 🐌 14.8 µs  
⚡ 10.1 µs 🐌 10.3 µs  

When profiling with NSIGHT Compute, we find that the bottleneck is that we do not have enough work for the GPU, and the work is very/ register-heavy. The usual way to solve this would be to make a Split-K solution, or to launch more blocks. However, these approaches do not work here. Split-K is bottlenecked by the fact that this problem output expects an fp32 accumulator casted to fp16. So in order for the atomics to add up correctly, we need to make a new fp32-buffer to add into, and then cast it back when we return it. This is much slower as we need to materialize new tensors. 
Blocking on BLOCK_N instead also works, however, this requires us to do more permutation on the shapes for the scales, which are returned for M = N = 128. These permutations cause data movement and new kernel launches which negate the benefits of making more SMs work.

All-in-All, the Triton solution gives us an average time of **16.2µs**. The cuBLAS reference of this kernel runs in about **15µs**, and the Triton call to **tl.dot_scaled** that we use calls the same instructions that the cuBLAS kernel does as explained here: https://triton-lang.org/main/getting-started/tutorials/10-block-scaled-matmul.html
This means that there is sadly not much more to be gained from the Triton solution, we have to go back to CuteDSL and try to think about on how to improve things.

### CuteDSL

Going off some of the constraints that we have found in the Triton solution, we give CuteDSL another shot.

We get inspired by the existing blackwell GEMM kernel off [github](https://github.com/NVIDIA/cutlass/blob/main/examples/python/CuTeDSL/blackwell/dense_blockscaled_gemm_persistent.py) and get:

⚡ 20.7 µs 🐌 21.0 µs  
⚡ 10.6 µs 🐌 10.9 µs  
⚡ 7.81 µs 🐌 8.18 µs  

2CTA for M does not make sense here because M is 128 for all benchmarked kernels, we change the shape to (128, 64, 256) and launch a (1,2) grid instead

⚡ 19.0 µs 🐌 19.9 µs  
⚡ 10.4 µs 🐌 10.5 µs  
⚡ 6.53 µs 🐌 6.86 µs  

This gives us an average of 11.0µs, which is 1.0µs slower than the top solution. This kind of tells us that we have probably reached the end of the line with the shapes.

In order to improve on this, I would:

Remove persistent kernels, we dont need persistence overhead for this tiny problem

Add cache modifiers. I did not figure out how to do this for TMA loads, but I later found out that you need to pass bytestring IR values to the cache policy. Confusing.

```python
_TMA_CACHE_EVICT_NORMAL = 0x1000000000000000  
_TMA_CACHE_EVICT_FIRST = 0x12F0000000000000
_TMA_CACHE_EVICT_LAST = 0x14F0000000000000
cache_policy=cutlass.Int64(cutlass.Int64(_TMA_CACHE_EVICT_FIRST).ir_value()),
```

---
# DUAL GEMM

The Dual GEMM challenge is up next, and its quite similar to the previous challenge. The difference is that we have some extra steps added. We get another block-scaled matrix, and we have a SiLU activation in between. 

The data and computation flow is as following:

We have 2 block-scaled TMEM multiplications, followed by an epilogue where we do SiLU on one of the outputs, and then element-wise multiplication with the SiLU:d and the non-SiLU:d output.

Shapes:
	  - {"m": 256, "n": 4096, "k": 7168, "l": 1, "seed": 1111}  
	  - {"m": 512, "n": 4096, "k": 7168, "l": 1, "seed": 1111}  
	  - {"m": 256, "n": 3072, "k": 4096, "l": 1, "seed": 1111}  
	  - {"m": 512, "n": 3072, "k": 7168, "l": 1, "seed": 1111}  

### CuteDSL
We start off with the CuteDSL reference:  
⚡ 71.6 µs 🐌 71.9 µs  
⚡ 71.1 µs 🐌 274 µs  
⚡ 60.1 µs 🐌 60.2 µs  
⚡ 76.4 µs 🐌 76.4 µs  

### Triton
We modify the Triton GEMM kernel from the previous simply, just passing the new B tensors, make another scaled_mm call and add epilogue like:
```python
    temp1 = accumulator1 * (1 / (1 + tl.exp(-accumulator1)))
    accumulator2 = temp1 * accumulator2
```
About 2 minutes of work gives us the result below which is a more reasonable baseline.  
⚡ 22.7 µs 🐌 23.2 µs  
⚡ 23.5 µs 🐌 23.7 µs  
⚡ 16.6 µs 🐌 16.6 µs  
⚡ 22.8 µs 🐌 22.8 µs  

### CuteDSL
There is no point to dwell on Triton improvements, so we go back to CuteDSL and try to adapt our previous solution the same way. This is sadly not as straight-forward as the Triton solution, as we will need to do a lot of manual shared memory allocation, especially for the epilogue. We also need to make sure to use the right column offsets for the TMEM when we have dual accumulators working.

With some struggles we get it working and get the runs:

⚡ 16.7 µs 🐌 18.2 µs  
⚡ 23.4 µs 🐌 23.7 µs  
⚡ 12.4 µs 🐌 12.4 µs  
⚡ 22.6 µs 🐌 22.6 µs  

We can see that clearly, smaller shapes are not well-supported in the cuBLAS kernel that Triton maps to with dot_scaled.

To improve upon this, we write the epilogue (SwiGLU) in PTX and get a 20% speed increase:
```python
{% raw %}
    asm_str = """
    {
        .reg .f32 %g0, %g1, %v0, %v1; //inputs gate0, gate1, val0, val1
        .reg .f32 %r0, %r1, %c0, %c1; //accums
        .reg .f16 %h0, %h1; //outputs

        // Load inputs (Output at $0)
        mov.f32 %g0, $1;
        mov.f32 %g1, $2;
        mov.f32 %v0, $3;
        mov.f32 %v1, $4;

        mul.f32 %c0, %g0, -1.44269504;     // exp arg
        ex2.approx.ftz.f32 %c0, %c0;      // exp result
        add.f32 %c0, %c0, 1.0;           // 1 + exp
        rcp.approx.ftz.f32 %c0, %c0;      // sigmoid = 1 / (1+exp)
        mul.f32 %r0, %g0, %c0;          // gate * sigmoid(x)
        mul.f32 %r0, %r0, %v0;          // val * gated_sigmoid(x)

        mul.f32 %c1, %g1, -1.44269504;
        ex2.approx.ftz.f32 %c1, %c1;
        add.f32 %c1, %c1, 1.0;
        rcp.approx.ftz.f32 %c1, %c1;
        mul.f32 %r1, %g1, %c1;
        mul.f32 %r1, %r1, %v1;

        // pack to f16x2
        cvt.rn.f16.f32 %h0, %r0;
        cvt.rn.f16.f32 %h1, %r1;
        
        // Write to Output ($0)
        mov.b32 $0, {%h0, %h1};
    }
{% endraw %}
    """
```


⚡ 14.4 µs 🐌 14.5 µs  
⚡ 18.5 µs 🐌 18.5 µs  
⚡ 10.3 µs 🐌 10.3 µs  
⚡ 18.5 µs 🐌 18.5 µs  

We then try to approximate the sigmoid using a single tanh call + ALU calls to reduce the SFU calls by 1, and after fiddling a bit to avoid precision errors we improve performance on the last bench:

```python
    asm_str = """
    {
        .reg .f32 %half_g0, %half_g1;
        .reg .f32 %tanh_in1;
        .reg .f32 %tanh0, %tanh1;
        .reg .f32 %res0, %res1; 

        mul.f32 %half_g0, $1, 0.5;
        mul.f32 %half_g1, $2, 0.5;

        // additive bias to fix single precision error
        add.f32 %tanh_in1, %half_g1, 0.0002;

        tanh.approx.f32 %tanh0, %half_g0;
        tanh.approx.f32 %tanh1, %tanh_in1;

        fma.rn.f32 %res0, %half_g0, %tanh0, %half_g0;
        fma.rn.f32 %res1, %half_g1, %tanh1, %half_g1;

        mul.f32 %res0, %res0, $3;
        mul.f32 %res1, %res1, $4;
        cvt.rn.f16x2.f32 $0, %res1, %res0;
    }
    """
```

⚡ 14.4 µs 🐌 14.5 µs  
⚡ 18.5 µs 🐌 18.5 µs  
⚡ 10.3 µs 🐌 10.3 µs  
⚡ 16.9 µs 🐌 17.1 µs  

We can also see in the SASS in NSIGHT that we have halved the instruction count by inlining PTX. So much for compilers... 
Either way, this was actually a little cathartic because I did a similar gate fusion in the TriMul competition that I won earlier this year, however that was on the Triton level, doing it in PTX makes me proud for my progress this year.

We realize we only have a single wave in every single kernel, and remove the C-pipeline as we don't need it with a single wave, this improves performance for the large problems:

⚡ 14.4 µs 🐌 14.5 µs  
⚡ 16.5 µs 🐌 16.6 µs  
⚡ 10.3 µs 🐌 10.3 µs  
⚡ 16.4 µs 🐌 16.5 µs  

At this point, we get quite stuck, here are the things I tried that did not work:

Use 2CTA (worse performance)  
Unroll SwiGLU PTX (no change)  
Vectorize SwiGLU PTX (slower kernel)  
Reorder PTX multiplication to fix SFU overhead (no diff)  
Use fp16x2 in PTX (too poor precision)  
Write MLIR cutlass dialects instead of PTX for SwiGLU for better fusion (slower kernel)  
Change Epilogue Tile size (16, 32, 64 gives same speed, larger or smaller gives slowdown)  
Overlap sC with sA/sB (not worth as we cant fit more AB-stages anyways for any of the shapes)  
Prefetch descriptors for AB pipeline (slower kernel)  
Use Async pipeline instead of UMMA pipeline (works only for small shapes due to race cond, fixable probably but seems to not be benefitial for small shapes either so we dont follow up)  
Increase occupancy (massive slowdown)  
Increase num_acc_stages (pointless because we have single wave)  
Have c_pipeline stages (slower kernel)  
Cap ab_stages at 4 (no change)  
Remove acc_pipeline and just use buffer(no gain)  
Accumulate acc_pipeline in stages(works for smaller kernel, no performance gain)  
Bitshift SFB1 by 1 to avoid multiplication with 0.5 in PTX tanh estimation (precision issues, need to multiply after accum)  
Change caching policies (worse performance)  
Change cluster shape (no change or worse)  
Add another MMA warp to do latency hiding (doesn't fit in TMEM)  


During the last 12 hours, we figure out that 2CTA launches actually benefit the first shape after all the other changes that we have applied somehow. This gives us:

⚡ 12.6 µs 🐌 14.4 µs  
⚡ 16.5 µs 🐌 16.6 µs  
⚡ 10.3 µs 🐌 10.3 µs  
⚡ 16.4 µs 🐌 16.5 µs  

This results makes us finish 4th, it's bittersweet to lose out on a podium position in such a competitive competition, but it's fully fair because the other contestants were working really hard and doing great optimizations until the very last hour of the competition.
