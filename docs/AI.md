# Local AI assistance

Interleave uses a real language model to explain a deterministic concurrency trace. It is an optional feature of the public lab and requires no account or API key.

## Flow

1. Open **Ask assistant** to inspect the current engine-verified facts.
2. Select **Enable local AI** to download and initialize the model. No model weights download before this action.
3. Ask a question or use an explanation, hint, or fix prompt. Tokens stream from a dedicated browser worker.
4. Stop an answer, start a new conversation, or remove the cached model. Closing the panel interrupts generation and cancels an active download. A loaded model is retained while the lab remains mounted.

The backend is `@mlc-ai/web-llm` 0.2.84 using `CreateWebWorkerMLCEngine` and `Qwen2.5-1.5B-Instruct-q4f32_1-MLC`, with a 4,096-token context and up to 500 output tokens. The provider is isolated in `features/assistant/browser-provider.ts`; the worker lives next to it. The lab lazy-loads the assistant interface, and model initialization requires a separate user action.

## Requirements and failure handling

Use a browser and device with WebGPU available. The model weight manifest inspected for this release lists 868,547,584 bytes across 30 shards; budget roughly 1 GB for the first download including other assets. WebLLM's model record estimates 1,888.97 MB of VRAM. About 2 GB is a useful planning estimate, not a guarantee: devices, browser limits, and runtime overhead vary. A stable connection is needed for the initial download. Cached assets may be reused until evicted by the browser.

Unsupported devices, failed downloads, worker errors, empty responses, and timeouts produce an actionable error. Loading has a five-minute timeout; generation has a two-minute timeout. Cancelling loading terminates the worker, and retries start a clean initialization. The send control remains disabled until a stopped generation has settled. The rest of the product remains usable without a model.

## Grounding and privacy

`features/assistant/context.ts` replays the selected schedule and enumerates the finite model. It supplies the actual state, operation order, invariant, status, counts, assumptions, explanation, and primary reference. The assistant receives a snapshot of that trace, bounded recent discussion, and the current question. Changing the experiment, mode, or execution hides the previous trace's conversation. History is capped at six messages and 2,400 characters; questions are capped at 1,200 characters. A very token-dense question can still exceed the model context and produce an error; shorten it and retry.

Verified facts are shown separately from AI text. The model has no tools, cannot execute code, cannot change the lab, and cannot save records. Model output is rendered as Markdown without raw HTML, generated hyperlinks, or images. These measures bound behavior; they do not establish the correctness of a small language model's explanation. Check claims against the trace and linked primary documentation.

Questions and answers are not sent to a hosted inference service. Loading assets contacts Hugging Face and the WebLLM binary host on GitHub; those hosts receive normal download request metadata. AI conversations exist in page memory and disappear on refresh. If you copy an answer into investigation notes and save it, those notes are stored in your authenticated workspace. Interleave adds no analytics or chat logging. Model files can be removed with **Remove model** or browser site-storage settings. Hosting and asset providers may maintain their own service logs.

## Validation

Automated tests cover fact grounding, input/history bounds, unsupported devices, streaming assembly, engine reuse, download cancellation, cleanup after failure, stopping, and cache removal. GPU I/O is replaced with an injectable runtime in provider tests; these are lifecycle tests, not actual inference tests.

A production build and HTTP delivery checks validate packaging. This release has **not been validated by running the model on a real browser GPU**, and no quality or speed benchmark is claimed. For a GPU validation report, record the browser, OS, GPU, download outcome, time to first token, and the actual answer to a known failing replay.

## Primary references

- [WebLLM basic usage](https://webllm.mlc.ai/docs/user/basic_usage.html)
- [WebLLM web workers](https://webllm.mlc.ai/docs/user/advanced_usage.html)
- [Qwen 2.5 1.5B Instruct model card](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)
- [MLC quantized model and its files](https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f32_1-MLC)

Interleave's MIT license covers its own source. Dependencies and downloaded model assets retain their respective licenses.
