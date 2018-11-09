node_modules/@financial-times/n-gage/index.mk:
	npm install --no-save @financial-times/n-gage
	touch $@

-include node_modules/@financial-times/n-gage/index.mk

unit-test:
	jest

unit-test-watch:
	jest --watch

minus-eslint: ci-n-ui-check _verify_lintspaces _verify_pa11y_testable

test: minus-eslint unit-test

docs:
	./scripts/generate-docs.sh > README.md
