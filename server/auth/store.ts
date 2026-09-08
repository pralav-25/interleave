import {
  digest,
  randomToken,
  validToken,
  SESSION_SECONDS,
} from './protocol.ts';
export interface AuthUser {
  id: string;
  email: string;
}
export function authStore(db: D1Database, now = () => Date.now()) {
  return {
    async issueCode(user: AuthUser, challenge: string) {
      const code = randomToken();
      await db
        .prepare('DELETE FROM auth_codes WHERE expires_at <= ? OR owner_id = ?')
        .bind(now(), user.id)
        .run();
      await db
        .prepare(
          'INSERT INTO auth_codes (code_hash, owner_id, email, challenge, expires_at) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(await digest(code), user.id, user.email, challenge, now() + 60000)
        .run();
      return code;
    },
    async exchange(code: string, verifier: string) {
      if (!validToken(code) || !validToken(verifier)) return null;
      // Consumption and verification are one atomic statement; a code cannot be replayed.
      const user = await db
        .prepare(
          'DELETE FROM auth_codes WHERE code_hash = ? AND challenge = ? AND expires_at > ? RETURNING owner_id AS id, email',
        )
        .bind(await digest(code), await digest(verifier), now())
        .first<AuthUser>();
      if (!user) return null;
      const token = randomToken();
      await db
        .prepare('DELETE FROM gateway_sessions WHERE expires_at <= ?')
        .bind(now())
        .run();
      await db
        .prepare(
          'INSERT INTO gateway_sessions (token_hash, owner_id, email, expires_at) VALUES (?, ?, ?, ?)',
        )
        .bind(
          await digest(token),
          user.id,
          user.email,
          now() + SESSION_SECONDS * 1000,
        )
        .run();
      await db
        .prepare(
          'DELETE FROM gateway_sessions WHERE owner_id = ? AND token_hash NOT IN (SELECT token_hash FROM gateway_sessions WHERE owner_id = ? ORDER BY expires_at DESC, token_hash DESC LIMIT 10)',
        )
        .bind(user.id, user.id)
        .run();
      return token;
    },
    async user(token: string) {
      if (!validToken(token)) return null;
      return db
        .prepare(
          'SELECT owner_id AS id, email FROM gateway_sessions WHERE token_hash = ? AND expires_at > ?',
        )
        .bind(await digest(token), now())
        .first<AuthUser>();
    },
    async revoke(token: string) {
      if (validToken(token))
        await db
          .prepare('DELETE FROM gateway_sessions WHERE token_hash = ?')
          .bind(await digest(token))
          .run();
    },
  };
}
