node_modules/@financial-times/n-gage/index.mk:
	npm install --no-save @financial-times/n-gage
	touch $@

-include node_modules/@financial-times/n-gage/index.mk

unit-test:
	jest

unit-test-watch:
	jest --watch

test: verify unit-test

docs:
	./scripts/generate-docs.sh > README.md
