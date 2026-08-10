import { signToken, verifyToken } from "./token";

describe("token", () => {
  const user = { id: "u1", email: "a@b.com", role: "owner", tenantId: "t1" };

  it("round-trips a valid token", () => {
    const payload = verifyToken(signToken(user));
    expect(payload).toMatchObject(user);
    expect(payload!.exp).toBeGreaterThan(Date.now());
  });

  it("rejects a tampered token", () => {
    const token = signToken(user);
    const [, sig] = token.split(".");
    const tampered = `Zm9v.${sig}`;
    expect(verifyToken(tampered)).toBeNull();
  });

  it("rejects a token with appended segments", () => {
    expect(verifyToken(`${signToken(user)}.extra`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signToken(user);
    const [, sig] = token.split(".");
    const expiredBody = Buffer.from(
      JSON.stringify({ ...user, exp: Date.now() - 1000 }),
    ).toString("base64url");
    const forged = `${expiredBody}.${sig}`;
    expect(verifyToken(forged)).toBeNull();
  });
});
