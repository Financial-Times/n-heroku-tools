var normalize = require("./normalize-name");

describe("normalize", () => {
  it("removes ft prefixes without options", () => {
    var alpha = normalize("ft-alpha");
    var beta = normalize("next-beta");
    var gamma = normalize("@financial-times/gamma");
    
    expect(alpha).toBe("alpha");
    expect(beta).toBe("beta");
    expect(gamma).toBe("@financial-times/gamma");
  });
  it("removes ft prefixes and versions", () => {
    var alpha = normalize("ft-alpha-v1", { version: false });
    var beta = normalize("next-beta-v99", { version: false });
    var gamma = normalize("ft-gamma-v123", { version: false });
    var delta = normalize("next-delta-v123", { version: false });
    var epsilon = normalize("@financial-times/epsilon", { version: false });

    expect(alpha).toBe("alpha-v1");
    expect(beta).toBe("beta-v99");
    expect(gamma).toBe("gamma");
    expect(delta).toBe("delta");
    expect(epsilon).toBe("epsilon");
  });
});
