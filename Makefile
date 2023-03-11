.PHONY: run
run: fmt
	deno run ./examples/runners/all.ts

.PHONY: fmt
fmt:
	deno fmt
