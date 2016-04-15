include n.Makefile

unit-test:
	export PORT=5134; mocha -r loadvars.js

test: unit-test

docs:
	./scripts/generate-docs.sh > README.md
