// Standalone Auth Client (Replaces Supabase Auth)
export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
    [key: string]: any;
  };
}

export interface AuthSession {
  access_token: string;
  user: AuthUser;
}

const STORAGE_USER_KEY = "tf_auth_user";
const STORAGE_TOKEN_KEY = "tf_auth_token";

// Deterministically generate a valid UUID from string (e.g. email or Google sub)
export function generateDeterministicUUID(input: string): string {
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ char;
  }
  const p1 = Math.abs(hash1).toString(16).padStart(8, "0");
  const p2 = Math.abs(hash2).toString(16).padStart(8, "0");
  const p3 = Math.abs(hash1 ^ hash2).toString(16).padStart(8, "0");
  const p4 = Math.abs(hash1 + hash2).toString(16).padStart(8, "0");
  const rawHex = (p1 + p2 + p3 + p4).slice(0, 32);

  return `${rawHex.slice(0, 8)}-${rawHex.slice(8, 12)}-4${rawHex.slice(13, 16)}-a${rawHex.slice(17, 20)}-${rawHex.slice(20, 32)}`;
}

export function parseJwtPayload(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to parse JWT payload:", e);
    return null;
  }
}

class StandaloneAuth {
  private currentUser: AuthUser | null = null;
  private token: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedUser = localStorage.getItem(STORAGE_USER_KEY);
      const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      }
      if (storedToken) {
        this.token = storedToken;
      }
    } catch (e) {
      console.error("Failed to load auth from storage", e);
    }
  }

  public async getUser(): Promise<{ data: { user: AuthUser | null }; error: any }> {
    if (!this.currentUser) {
      this.loadFromStorage();
    }
    return {
      data: { user: this.currentUser },
      error: this.currentUser ? null : new Error("Not logged in"),
    };
  }

  public async getSession(): Promise<{ data: { session: AuthSession | null }; error: any }> {
    if (!this.currentUser) {
      this.loadFromStorage();
    }
    if (!this.currentUser) {
      return { data: { session: null }, error: new Error("No active session") };
    }
    return {
      data: {
        session: {
          access_token: this.token || "mock_token_" + this.currentUser.id,
          user: this.currentUser,
        },
      },
      error: null,
    };
  }

  public signIn(user: AuthUser, token?: string) {
    this.currentUser = user;
    this.token = token || "token_" + user.id;
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    localStorage.setItem(STORAGE_TOKEN_KEY, this.token);
  }

  public setToken(token: string) {
    this.token = token;
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
  }

  public async signOut(): Promise<void> {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    try {
      const rawBackendUrl = import.meta.env.VITE_PROD_URL_BACKEND || "http://localhost:8000";
      const backendUrl = rawBackendUrl.startsWith("http") ? rawBackendUrl : `http://${rawBackendUrl}`;
      await fetch(`${backendUrl}/user/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout cookie clear error:", e);
    }
  }

  public signInWithDAuth(userData: {
    id: string;
    email: string;
    name?: string;
    pfp?: string;
    gender?: string;
    roll_number?: string;
  }, token?: string): AuthUser {
    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      user_metadata: {
        full_name: userData.name || userData.email.split("@")[0],
        name: userData.name || userData.email.split("@")[0],
        avatar_url: userData.pfp || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name || userData.email)}`,
        picture: userData.pfp || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name || userData.email)}`,
        gender: userData.gender,
        roll_number: userData.roll_number,
      },
    };

    this.signIn(user, token);
    return user;
  }
}

export const auth = new StandaloneAuth();
export const supabase = { auth }; // Backward compatibility alias
