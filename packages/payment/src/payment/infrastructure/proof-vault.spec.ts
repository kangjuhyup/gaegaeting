import { ProofVault } from "./proof-vault.js";

describe("구매 증거의 암호화 보관", () => {
  const vault = new ProofVault("01".repeat(32));
  test("같은 증거도 다른 암호문으로 보관하고 원문을 복구한다", () => {
    const first = vault.encrypt("secret-token"),
      second = vault.encrypt("secret-token");
    expect(first).not.toBe(second);
    expect(first).not.toContain("secret-token");
    expect(vault.decrypt(first)).toBe("secret-token");
  });
  test("암호문 변조나 다른 키로 조회하면 원문을 반환하지 않는다", () => {
    const value = vault.encrypt("secret-token"),
      parts = value.split(".");
    parts[2] = Buffer.alloc(16).toString("base64url");
    expect(() => vault.decrypt(parts.join("."))).toThrow("PROOF_UNAVAILABLE");
    expect(() => new ProofVault("02".repeat(32)).decrypt(value)).toThrow(
      "PROOF_UNAVAILABLE",
    );
  });
});
