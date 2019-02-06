// A mock of the commander program
function createMockProgram () {
	const program = {};

	program.command = jest
		.fn(() => {
			return program;
		})
		.mockName('program.command');
	program.description = jest
		.fn(() => {
			return program;
		})
		.mockName('program.description');
	program.option = jest
		.fn(() => {
			return program;
		})
		.mockName('program.option');
	program.action = jest
		.fn(() => {
			return program;
		})
		.mockName('program.action');

	return program;
}

module.exports = createMockProgram;
