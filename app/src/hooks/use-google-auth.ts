import { useCallback, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";

// Ensure any in-progress auth browser completes cleanly
WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

// Standard RFC 7636 PKCE generator
function generateCodeVerifier(length = 64): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  const randomBytes = Crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Extract authorization code from callback URL
function extractAuthCode(url: string): string | null {
  try {
    const queryIndex = url.indexOf("?");
    if (queryIndex !== -1) {
      const query = url.substring(queryIndex + 1).split("#")[0];
      const params = new URLSearchParams(query);
      return params.get("code");
    }
  } catch (err) {
    console.warn("[Google Auth] Error parsing callback URL:", err);
  }
  return null;
}

/**
 * Universal Google OAuth hook using standard Authorization Code Flow with PKCE.
 * Complies 100% with Google's OAuth 2.0 policy (no unsupported_response_type errors).
 */
export function useGoogleAuth() {
  const [idToken, setIdToken] = useState<string | null>(null);

  const promptAsync = useCallback(async () => {
    setIdToken(null);

    const isWeb = Platform.OS === "web";
    const clientId = isWeb ? WEB_CLIENT_ID : (IOS_CLIENT_ID || WEB_CLIENT_ID);

    // Build the compliant redirect URI
    let redirectUri: string;
    if (isWeb) {
      redirectUri = typeof window !== "undefined" ? window.location.origin : "http://localhost:8081";
    } else {
      const prefix = IOS_CLIENT_ID.replace(".apps.googleusercontent.com", "");
      redirectUri = `com.googleusercontent.apps.${prefix}:/oauth2redirect/google`;
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&code_challenge=${encodeURIComponent(codeChallenge)}` +
      `&code_challenge_method=S256` +
      `&scope=${encodeURIComponent("openid email profile")}`;

    console.log("[Google Auth] Opening auth session with redirect:", redirectUri);

    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === "success" && result.url) {
        const code = extractAuthCode(result.url);
        if (!code) {
          throw new Error("No authorization code received from Google.");
        }

        console.log("[Google Auth] Exchanging authorization code for tokens...");

        // Exchange authorization code for ID token via Google's token endpoint
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
            code_verifier: codeVerifier,
          }).toString(),
        });

        const tokenData = await tokenRes.json();
        if (tokenData.error) {
          throw new Error(tokenData.error_description || tokenData.error);
        }

        if (tokenData.id_token) {
          setIdToken(tokenData.id_token);
        } else {
          throw new Error("Google token exchange completed but no id_token was returned.");
        }
      } else if (result.type === "cancel" || result.type === "dismiss") {
        console.log("[Google Auth] User cancelled or dismissed sign-in.");
      }
    } catch (error) {
      console.error("[Google Auth] Error during sign-in:", error);
      throw error;
    }
  }, []);

  return {
    isReady: true,
    promptAsync,
    idToken,
    clearToken: () => setIdToken(null),
  };
}
