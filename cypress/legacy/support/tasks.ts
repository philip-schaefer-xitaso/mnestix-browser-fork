import { encode } from 'next-auth/jwt';
import jwt from 'jsonwebtoken';

// Mirrors next-auth's own session cookie chunking so a programmatically created
// session is indistinguishable from one created through a real browser login.
// See node_modules/next-auth/src/core/lib/cookie.ts (#chunk): allowed cookie size
// is 4096 bytes, minus an estimated 163 bytes of cookie-attribute overhead.
const ALLOWED_COOKIE_SIZE = 4096;
const ESTIMATED_EMPTY_COOKIE_SIZE = 163;
const CHUNK_SIZE = ALLOWED_COOKIE_SIZE - ESTIMATED_EMPTY_COOKIE_SIZE;

export interface SessionCookie {
    name: string;
    value: string;
}

export interface CreateKeycloakSessionArgs {
    username: string;
    password: string;
    keycloakIssuer: string;
    keycloakRealm: string;
    keycloakClientId: string;
    nextAuthSecret: string;
}

/**
 * Authenticates directly against Keycloak's token endpoint (Resource Owner
 * Password grant - the test realm client is public with direct access grants
 * enabled) and mints a real NextAuth session cookie for it, using the same
 * `encode()` NextAuth uses for real logins. This avoids ever driving the
 * cross-site OAuth redirect dance through Cypress, which is the root cause of
 * the Keycloak-related E2E flakiness (see /memories/repo/cypress-flakes.md).
 */
export async function createKeycloakSession(args: CreateKeycloakSessionArgs): Promise<SessionCookie[]> {
    const { username, password, keycloakIssuer, keycloakRealm, keycloakClientId, nextAuthSecret } = args;
    const tokenEndpoint = `${keycloakIssuer}/realms/${keycloakRealm}/protocol/openid-connect/token`;
    const userinfoEndpoint = `${keycloakIssuer}/realms/${keycloakRealm}/protocol/openid-connect/userinfo`;

    const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'password',
            client_id: keycloakClientId,
            username,
            password,
            scope: 'openid email profile',
        }),
    });
    if (!tokenResponse.ok) {
        throw new Error(
            `Keycloak password grant failed for user "${username}" (status ${tokenResponse.status}): ` +
                (await tokenResponse.text()),
        );
    }
    const tokenSet = (await tokenResponse.json()) as {
        access_token: string;
        id_token: string;
        refresh_token: string;
        expires_in: number;
    };

    const userinfoResponse = await fetch(userinfoEndpoint, {
        headers: { Authorization: `Bearer ${tokenSet.access_token}` },
    });
    if (!userinfoResponse.ok) {
        throw new Error(`Keycloak userinfo request failed (status ${userinfoResponse.status})`);
    }
    const userinfo = (await userinfoResponse.json()) as { sub: string; name?: string; email?: string };

    const decodedAccessToken = jwt.decode(tokenSet.access_token) as {
        resource_access?: Record<string, { roles?: string[] }>;
    } | null;
    const roles = decodedAccessToken?.resource_access?.[keycloakClientId]?.roles ?? [];

    // Mirrors the shape authOptions.callbacks.jwt() produces for a Keycloak sign-in
    // (see src/components/authentication/authConfig.ts).
    const nextAuthToken = {
        name: userinfo.name,
        email: userinfo.email,
        sub: userinfo.sub,
        roles,
        access_token: tokenSet.access_token,
        id_token: tokenSet.id_token,
        refresh_token: tokenSet.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + tokenSet.expires_in,
    };

    const encodedSessionToken = await encode({
        token: nextAuthToken,
        secret: nextAuthSecret,
        maxAge: 30 * 24 * 60 * 60,
    });

    return chunkSessionCookie(encodedSessionToken);
}

function chunkSessionCookie(value: string): SessionCookie[] {
    const cookieName = 'next-auth.session-token';
    if (value.length <= CHUNK_SIZE) {
        return [{ name: cookieName, value }];
    }
    const chunks: SessionCookie[] = [];
    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < chunkCount; i++) {
        chunks.push({ name: `${cookieName}.${i}`, value: value.substr(i * CHUNK_SIZE, CHUNK_SIZE) });
    }
    return chunks;
}
