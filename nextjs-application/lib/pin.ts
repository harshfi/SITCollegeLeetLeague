import bcrypt from 'bcryptjs';

export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(pin, salt);
}

export async function verifyPin(
  pin: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
