include n.Makefile

SHOULD_BE = $(shell ./scripts/generate-docs.sh)
IS = $(shell cat README.md)

clean:
	git clean -fxd

verify:
	@$(MAKE) verify-super
ifeq ($(SHOULD_BE),$(IS))
	@echo "README.md up-to-date"
else
	@echo "README.md out-of-sync with ./bin/next-build-tools.js, run \`make docs\` and commit"
# temporarily removed from verify due to line-endings problem
#  @exit 1
endif

unit-test:
	export PORT=5134; mocha -r loadvars.js

test: unit-test

docs:
	./scripts/generate-docs.sh > README.md

install:
	npm i
