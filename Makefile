.PHONY: test
SHOULD_BE = $(shell ./scripts/generate-docs.sh | md5 -q)
IS = $(shell md5 -q README.md)

verify:
ifeq ($(SHOULD_BE),$(IS))
	@echo "README.md up-to-date"
else
	@echo "README.md out-of-sync with ./bin/next-build-tools.js, run \`make docs\` and commit"
	@exit 1
endif
	./bin/next-build-tools.js verify --skip-layout-checks --skip-dotenv-check

test: verify
	mocha ./test/

docs:
	./scripts/generate-docs.sh > README.md

