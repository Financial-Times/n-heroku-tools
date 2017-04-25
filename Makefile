include n.Makefile

unit-test:
	export PORT=5134; mocha -r loadvars.js

minus-eslint: ci-n-ui-check _verify_lintspaces _verify_scss_lint _verify_pa11y_testable

test: minus-eslint unit-test

docs:
	./scripts/generate-docs.sh > README.md
