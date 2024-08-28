import crypto from "crypto";
import readlineSync from "readline-sync";

export const decrypt = (password: string, val: string) => {
  const hashedPassword = crypto.createHash("sha256").update(password).digest();
  const encryptedText = Buffer.from(val, "base64");
  const IV = encryptedText.subarray(0, 16);
  const encrypted = encryptedText.subarray(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", hashedPassword, IV);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString();
};

export const decryptMnemonic = (
  question: string,
  encryptedMnemonic: string
) => {
  const password = readlineSync.question(question, {
    hideEchoBack: true,
  });
  return decrypt(password, encryptedMnemonic);
};
