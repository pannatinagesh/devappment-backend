import crypto from 'node:crypto';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import 'dotenv/config';

function getPrivateKey(): string {
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error('PRIVATE_KEY is not set');
  return key;
}

function getPublicKey(): string {
  const key = process.env.PUBLIC_KEY;
  if (!key) throw new Error('PUBLIC_KEY is not set');
  return key;
}

export async function decryptData(encryptedData: string) {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');
    const decrypted = crypto.privateDecrypt(
      { key: getPrivateKey(), padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      buffer,
    );
    return decrypted.toString('utf8');
  }
  catch (err) {
    return false;
  }
}

export async function encryptData(data: string) {
  try {
    const buffer = Buffer.from(data, 'utf8');
    const encryptedBuffer = crypto.publicEncrypt(
      {
        key: getPublicKey(),
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );
    const encryptedData = encryptedBuffer.toString('base64');
    return encryptedData;
  }
  catch (error) {
    return false;
  }
}