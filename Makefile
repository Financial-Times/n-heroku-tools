.PHONY: test
SHOULD_BE = $(shell ./scripts/generate-docs.sh)
IS = $(shell cat README.md)

clean:
	git clean -fxd

verify:
	echo $(SHOULD_BE);
	echo $(IS);
ifeq ($(SHOULD_BE),$(IS))
	@echo "README.md up-to-date"
else
	@echo "README.md out-of-sync with ./bin/next-build-tools.js, run \`make docs\` and commit"
	@exit 1
endif
	./bin/next-build-tools.js verify --skip-layout-checks --skip-dotenv-check | grep -v Warning

unit-test:
	mocha -r loadvars.js

test: verify unit-test

docs:
	./scripts/generate-docs.sh > README.md

install:
	npm i
