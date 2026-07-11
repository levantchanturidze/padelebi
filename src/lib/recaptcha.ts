/**
 * Server-side reCAPTCHA v3 verification. Returns true when the token is valid
 * (or when no secret is configured, e.g. local dev). Uses URLSearchParams so
 * the user-supplied token is properly encoded in the request body.
 */
export async function verifyRecaptcha(
  token: string | null | undefined,
  minScore = 0.5,
): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true; // not configured — treat as pass (dev)
  if (!token) return false;

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }).toString(),
    });
    const data = (await res.json()) as { success: boolean; score?: number };
    if (!data.success) return false;
    if (data.score !== undefined && data.score < minScore) return false;
    return true;
  } catch {
    return false;
  }
}
