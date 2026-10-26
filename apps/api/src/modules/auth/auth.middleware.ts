/**
 * TODO:
 * - Read the signed JWT from the HTTP-only cookie.
 * - Verify it using JWT_SECRET.
 * - Load or validate the user's current role server-side.
 * - Attach a minimal authenticated user object to the request.
 * - Fail closed for missing/invalid tokens.
 *
 * Do not trust a role supplied in request body, query, or local storage.
 */
export {};
