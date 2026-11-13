import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../lib/prisma.js";
import { buildTokenPair, persistSession, assignDefaultFreePlan, sanitizeUser } from "./auth.service.js";

// ─── Google OAuth Configuration ──────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_ID_IOS = process.env.GOOGLE_CLIENT_ID_IOS;
const GOOGLE_CLIENT_ID_ANDROID = process.env.GOOGLE_CLIENT_ID_ANDROID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Accept tokens issued for web, iOS, OR Android client IDs
const ACCEPTED_AUDIENCES = [
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_ANDROID,
].filter(Boolean) as string[];

// ─── Verify Google ID Token ──────────────────────────────────────────────────

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

async function verifyGoogleToken(idToken: string): Promise<GoogleProfile> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: ACCEPTED_AUDIENCES,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google token: no payload");

  const { sub, email, name, email_verified } = payload;

  if (!email) throw new Error("Google account does not have an email address");
  if (!email_verified) throw new Error("Google email is not verified");

  return {
    googleId: sub,
    email,
    name: name || email.split("@")[0],
    emailVerified: !!email_verified,
  };
}

// ─── Google Sign-In (Login / Link / Register) ───────────────────────────────

export async function googleSignIn(
  idToken: string,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  const profile = await verifyGoogleToken(idToken);

  // 1. Check if user already exists by googleId → direct login
  let user = await prisma.user.findUnique({
    where: { googleId: profile.googleId },
  });

  if (user) {
    if (user.status !== "ACTIVE") {
      throw new Error("Your account has been suspended or deactivated");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { accessToken, refreshToken } = buildTokenPair(user.id, user.role);
    await persistSession(user.id, refreshToken, meta?.ipAddress, meta?.userAgent);

    return { user: sanitizeUser(user), accessToken, refreshToken };
  }

  // 2. Check if user exists by email but hasn't linked Google → link accounts
  user = await prisma.user.findUnique({
    where: { email: profile.email },
  });

  if (user) {
    if (user.status !== "ACTIVE") {
      throw new Error("Your account has been suspended or deactivated");
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: profile.googleId,
        authProvider: "GOOGLE",
        emailVerified: true,
        lastLoginAt: new Date(),
      },
    });

    const { accessToken, refreshToken } = buildTokenPair(user.id, user.role);
    await persistSession(user.id, refreshToken, meta?.ipAddress, meta?.userAgent);

    return { user: sanitizeUser(user), accessToken, refreshToken };
  }

  // 3. New user → create account as CUSTOMER
  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        authProvider: "GOOGLE",
        emailVerified: true,
        role: "CUSTOMER",
        // No passwordHash — Google-only account
      },
    });

    await assignDefaultFreePlan(newUser.id, "CUSTOMER", tx);

    return newUser;
  });

  const { accessToken, refreshToken } = buildTokenPair(result.id, result.role);
  await persistSession(result.id, refreshToken, meta?.ipAddress, meta?.userAgent);

  return { user: sanitizeUser(result), accessToken, refreshToken };
}

