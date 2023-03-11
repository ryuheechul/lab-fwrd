.PHONY: run
run: fmt
	deno run on-off.ts

.PHONY: fmt
fmt:
	deno fmt
