#!/usr/bin/env node
// Encrypts the private exam bank (questions, answer key, hidden tests) for the public repo.
// usage: EXAM_BANK_KEY=<64 hex> node scripts/encrypt-exam-bank.mjs path/to/bank.json > exam/bank.enc.json
import crypto from "node:crypto";
import fs from "node:fs";

const key = process.env.EXAM_BANK_KEY;
if (!key || !/^[0-9a-f]{64}$/i.test(key)) throw new Error("Set EXAM_BANK_KEY (32 bytes hex)");
const plain = fs.readFileSync(process.argv[2], "utf8");
JSON.parse(plain);
const iv = crypto.randomBytes(12);
const c = crypto.createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
process.stdout.write(JSON.stringify({ v: 1, alg: "aes-256-gcm", iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), data: data.toString("base64") }) + "\n");
