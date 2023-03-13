.PHONY: run
run: fmt
	cd examples && $(MAKE) run

.PHONY: fmt
fmt:
	cd fwrd && $(MAKE) fmt
	cd examples && $(MAKE) fmt
