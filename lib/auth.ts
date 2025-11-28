import sql from "./db"

// Utility function to convert string to ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
  const uint8Array = new TextEncoder().encode(str);
  return uint8Array.buffer;
}

// Utility function to convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  return Array.from(view).map(b => b.toString(16).padStart(2, '0')).join('');
}

// PBKDF2 implementation using Web Crypto API
async function pbkdf2(password: string, salt: string, iterations: number, length: number): Promise<string> {
  const passwordBuffer = stringToArrayBuffer(password);
  const saltBuffer = stringToArrayBuffer(salt);

  // Import the password as a key
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations,
      hash: "SHA-512"
    },
    keyMaterial,
    length * 8 // length in bits
  );

  return arrayBufferToHex(derivedBits);
}

// Hash password with salt
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt using Web Crypto API
  const saltArray = new Uint8Array(16);
  crypto.getRandomValues(saltArray);
  const salt = Array.from(saltArray).map(b => b.toString(16).padStart(2, '0')).join('');

  const hash = await pbkdf2(password, salt, 1000, 64);
  return `${salt}:${hash}`;
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const [salt, hash] = hashedPassword.split(":");
  const hashToCompare = await pbkdf2(password, salt, 1000, 64);
  return hash === hashToCompare;
}

// Register user
export async function registerUser(email: string, password: string) {
  const hashedPassword = await hashPassword(password);

  try {
    const result = await sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${hashedPassword}) RETURNING id, email`;
    return result[0];
  } catch (error: any) {
    if (error.message?.includes("duplicate")) {
      throw new Error("Email already exists");
    }
    throw error;
  }
}

// Login user
export async function loginUser(email: string, password: string) {
  const result = await sql`SELECT id, email, password_hash FROM users WHERE email = ${email}`;

  if (!result.length) {
    throw new Error("Invalid email or password");
  }

  const user = result[0];
  if (!(await verifyPassword(password, user.password_hash))) {
    throw new Error("Invalid email or password");
  }

  // Create session token using Web Crypto API
  const tokenArray = new Uint8Array(32);
  crypto.getRandomValues(tokenArray);
  const token = Array.from(tokenArray).map(b => b.toString(16).padStart(2, '0')).join('');

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await sql`INSERT INTO sessions (user_id, token, expires_at) VALUES (${user.id}, ${token}, ${expiresAt})`;

  return { id: user.id, email: user.email, token };
}

// Verify session token
export async function verifySession(token: string) {
  const result = await sql`SELECT user_id FROM sessions WHERE token = ${token} AND expires_at > NOW()`;

  if (!result.length) {
    return null;
  }

  const session = result[0];
  const user = await sql`SELECT id, email FROM users WHERE id = ${session.user_id}`;
  return user[0];
}

// Logout user
export async function logoutUser(token: string) {
  await sql`DELETE FROM sessions WHERE token = ${token}`;
}
