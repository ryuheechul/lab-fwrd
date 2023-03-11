.PHONY: run
run: fmt
	deno run ./examples/runners/on-off.ts

.PHONY: fmt
fmt:
	deno fmt
