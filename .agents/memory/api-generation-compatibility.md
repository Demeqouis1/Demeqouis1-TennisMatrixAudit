---
name: OpenAPI client generation compatibility
description: The workspace's generated Zod client must stay compatible with the installed Zod 3 runtime.
---
Keep OpenAPI numeric response fields represented in a way that Orval emits Zod 3-compatible schemas; the installed runtime does not expose the Zod 4 top-level `z.int()` helper.

**Why:** Code generation succeeded only after avoiding Orval's incompatible integer emitter, while the rest of the generated client and server remained healthy.

**How to apply:** When changing the API contract, run API code generation and library typechecking together before touching application code.