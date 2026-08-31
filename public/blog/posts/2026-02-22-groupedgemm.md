# NVIDIA GB200 Grouped GEMM Challenge

For the last part of the NVIDIA 4-part competition, we have a grouped GEMM. 
Grouped GEMM is an interesting and very relevant kernel. We have matrix multiplications of different sizes that need to be executed efficiently. This can happen for example in MoE models, where we have a dynamic number of tokens going to each expert with potentially dynamic MMA-shapes.

This challenge of the competition was marked by an increased importance on host-side code optimization. The more complex a problem gets, the more there is to gain by doing scheduling, pre-computation and ordering of workload executions on the CPU.

To solve this, we need to keep track of the memory locations where the matrices start and end on the GPU. The existing solution for this are tensormaps, which define where the async TMA loads should get their data from.
Here is a small image to explain how the data looks like for this competition:
![[Pasted image 20260222104814.png]]

Here are the shapes that are used:
  ```
  G  M_values    N_values    K_values  L time[us]
  8 [80, 176, 128, 72, 64, 248, 96, 160] [4096, 4096, 4096, 4096, 4096, 4096, 4096, 4096] [7168, 7168, 7168, 7168, 7168, 7168, 7168, 7168] 1 18.833
  
  8 [40, 76, 168, 72, 164, 148, 196, 160] [7168, 7168, 7168, 7168, 7168, 7168, 7168, 7168] [2048, 2048, 2048, 2048, 2048, 2048, 2048, 2048] 1 10.667
  
  2 [192, 320] [3072, 3072] [4096, 4096] 1 2.406
  
  2 [128, 384] [4096, 4096] [1536, 1536] 1 1.525
ranking_by: "geom"
  ```

At this point of the competition, I am CuteDSL-pilled 💊. Triton is a faint memory of a clunky black-box, we dive in head-first.

All solutions are public on [GitHub](https://github.com/arseniivanov/nvidia_nvfp4_fp8_competition/tree/main/grouped_gemm).
### CuteDSL

Reference:  
⚡ 334 µs 🐌 391 µs  
⚡ 334 µs 🐌 368 µs  
⚡ 148 µs 🐌 203 µs  
⚡ 132 µs 🐌 162 µs  

We see that the reference is very basic, we have a single TMA-MMA warp, lots of hard-coded copy ops. This will not get us far, instead we take the grouped GEMM from the [CUTLASS github](https://github.com/NVIDIA/cutlass/blob/main/examples/python/CuTeDSL/blackwell/grouped_blockscaled_gemm.py) and adapt it.
It's surprisingly non-trivial to adapt the existing CUTLASS solution to our input as the problem makes us materialize the tensors inside the kernel call while the reference is passing pointers all the way until the launch, it's also hard to use the previous entries to build this one as the tensors are fused and the C-matrix does not have its own tensormap in the reference. 

We find that function type-hints in CuteDSL are crucial, adding a function parameter type hint as const will work as a hard compile-time constraint. 

We also notice that the variation is quite large between runs, so sadly we have to give up our cute emojis in favor for the more precise but dull clock emoji.

Porting the CuteDSL CUTLASS Grouped GEMM gives us:

⏱ 157 ± 0.8 µs  
⏱ 144 ± 0.5 µs  
⏱ 110 ± 0.7 µs  
⏱ 108 ± 0.6 µs  

We add 2CTA support, however this does not give a big benefit at this stage.

We then remove the stride calculation that are present in the original kernel(**strides_abc**), for our case where we have K-major matrices and static K+N shapes, we will have static strides (K, 1) and have no situation where we need the more general strided solution. This gives us:

⏱ 132 ± 0.4 µs  
⏱ 123 ± 0.4 µs  
⏱ 92.8 ± 0.72 µs  
⏱ 92.1 ± 0.86 µs  

We then benchmark the kernels in NCU, and find that there is a massive discrepancy between the reported time and the NCU kernel reported time. This means that we have an inefficient host launch. We see that we re-create all of the tensor pointers on each launch, and most importantly we have multiple tensor allocations happening on every single launch. Instead, we opt for allocating all the memory needed once, and then accessing it using a cache with pointers when we run the kernel next time. We notice that this removes the massive deviations/bad benchmarks, and we can go back to the colorful emojis:

⚡ 52.2 µs 🐌 52.6 µs  
⚡ 44.3 µs 🐌 44.6 µs  
⚡ 23.7 µs 🐌 24.4 µs  
⚡ 21.2 µs 🐌 21.4 µs  

We notice that even when we cache kernels and pin memory, we still have 3 independent GPU copy calls for the buffers. This will create 3 separate allocation kernels. It makes more sense to make a single memory area allocation and copy all data to this in one go, doing this gives us a flat 8us improvement for all problems.

⚡ 44.2 µs 🐌 44.3 µs  
⚡ 36.0 µs 🐌 36.8 µs  
⚡ 16.0 µs 🐌 16.6 µs  
⚡ 12.9 µs 🐌 13.2 µs  

We set up a config for each shape, allowing us to test various combinations of parameters for the various kernel sizes. This yields small improvements for some of the shapes:

⚡ 44.2 µs 🐌 44.3 µs  
**⚡ 29.8 µs 🐌 30.1 µs**  
⚡ **14.9 µs 🐌 15.6 µs**  
⚡ 12.9 µs 🐌 13.2 µs  

Here we sit and think. We have about 50% of SOL on the first shape, 40% on the second shape, 13% on the third and 5% fourth. Clearly the overheads from all the tensormaps and pointer memory is a bit too much for the small shapes. Since its just 2 shapes, maybe we can launch 2 ordinary non-grouped GEMMs without tensormap pointers?
We try, but this only helps the very smallest shape marginally.

⚡ 44.2 µs 🐌 44.3 µs  
⚡ 29.8 µs 🐌 30.1 µs  
⚡ 14.9 µs 🐌 15.6 µs  
**⚡ 12.5 µs 🐌 12.5 µs**  

We add compilation flags that we forgot and shave off some nanoseconds:

**⚡ 43.3 µs 🐌 43.6 µs**  
**⚡ 29.3 µs 🐌 29.8 µs**  
**⚡ 14.8 µs 🐌 15.0 µs**  
⚡ 12.5 µs 🐌 12.5 µs  

I was a bit busy during the period of this competition, and did not manage to improve things further.
I strongly suspect that the Tensormap allocation is a big bottleneck in this solution. We are doing 4 fences for different memory areas just in the TMA copy due to this. We can see the the winning solutions all have their own way of handling this. Some have a manual tensormap, some pass all pointers directly in the argument and do if-elses.

All-in-all, we manage to improve the reference kernel solution by about 10x, reaching 23% of the SOL geomean.

---
### Improvements from guaguabear's solution
After the competition ended, I checked out the winning solutions. I will list some improvements from the point where we left off:

My best kernel average:  
**⏱ 22.8 µs**  

Pass all pointers as kernel arguments instead of having pinned memory. Since we have small groups, we are able to pass along all pointers directly into the kernel instead of copying from host to device.  
**⏱ 19.7 µs**  

Simple group work assignments. In order to decide which CTA does what work, the general solution uses **delinearize_z** which will read group_sizes from GMEM. This solution instead uses a much more naive prefix-sum schedule that pre-computes which CTA will work on what block, and reduces the assignment to a simple lookup in SMEM. This big performance jump is super-interesting, i theorize further down about this.  
**⏱ 16.5 µs**  

The general solution uses a round-robin scheduler to make sure that every CTA is working. This is really good for workload balancing, every CTA will have work scheduled. However, in our case, the groups are very homogeneously sized, there is no need for load-balancing, and its more efficient that a CTA switches between work within it's own group instead of random assignment that might land it in a separate group.  
**⏱ 15.9 µs**  

Remove Dynamic TensorMap allocation. Precalculate all of the TMA pointers as group sizes are known, index lists of TMA atoms that already point to the correct memory location and avoid all dynamic tensormap scheduler syncs.  
**⏱ 14.5 µs**  

Max_active_cluster shape-based optimization. Essentially we can reduce the TMA load pressure and make the compute better aligned by splitting evenly. If we are running on 128 instead of 148 SMs for 2 waves, we will use less of the GPU die, do less requests to the TMA scheduler, create less heat and do less throttling.    
**⏱ 13.8 µs**  

The final best solution reaches about 38% of the SOL geomean according to gau.nernst's [table](https://github.com/gau-nernst/gpu-mode-kernels/tree/main/nvidia/nvfp4_group_gemm)  

---
### Reflection

In general, I think it's interesting to consider the impact of certain optimizations on others. For example, replacing **delinearize_z** might not feel like a big thing, you are just not doing some modulus operands. However, this also means that you don't need to allocate registers to do modulus operands, which increases throughput of other parts of the system dramatically in a way you might not have thought of.

It's also interesting to think of how the general solution can be improved looking at the optimizations here. I think that general GPU kernel designers need to think about the overhead that their solution causes. For example, the **pipeline_arrive_init** will default to doing nothing for a single CTA cluster (1,1), which is great design. But the delinearize_z, or the tensormap might not make full sense in every case. In some sense, this competition is probably helping the CUTLASS library maintainers to make branches for various workload sizes and shapes, for example by branching to template-scheduling solutions when given homogenous workloads.

---

For the CUDA-state-of-minded people, the winner gau.nernst also has a fantastic writeup of the solutions with a non-tile-based-DSL-approach.

https://github.com/gau-nernst/gpu-mode-kernels/tree/main/nvidia/nvfp4_group_gemm

