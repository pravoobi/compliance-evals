import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  randomUUID,
} from "crypto";
import type {
  AuditRecord,
  EvalResult,
  Issue,
  Sample,
} from "@compliance-evals/types";

export interface EvidenceBundle {
  bundleId: string;
  exportedAt: string;
  exportedBy: string;
  samples: Sample[];
  results: EvalResult[];
  auditRecords: AuditRecord[];
  issues: Issue[];
  chainValid: boolean;
  contentHash: string;
}

export interface SignedEvidenceExport {
  bundle: EvidenceBundle;
  publicKeyPem: string;
  signature: string;
  algorithm: "ed25519";
}

export function buildEvidenceBundle(
  params: Omit<EvidenceBundle, "bundleId" | "exportedAt" | "contentHash">
): EvidenceBundle {
  const bundleId = randomUUID();
  const exportedAt = new Date().toISOString();
  const payload = {
    bundleId,
    exportedAt,
    exportedBy: params.exportedBy,
    samples: params.samples,
    results: params.results,
    auditRecords: params.auditRecords,
    issues: params.issues,
    chainValid: params.chainValid,
  };
  const contentHash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  return { ...payload, contentHash };
}

export function signBundle(
  bundle: EvidenceBundle
): SignedEvidenceExport {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const data = Buffer.from(JSON.stringify(bundle));
  const signature = sign(null, data, privateKey).toString("base64");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }) as string;
  return { bundle, publicKeyPem, signature, algorithm: "ed25519" };
}

export function verifySignedExport(exported: SignedEvidenceExport): boolean {
  try {
    const pubKey = createPublicKey(exported.publicKeyPem);
    const data = Buffer.from(JSON.stringify(exported.bundle));
    return verify(null, data, pubKey, Buffer.from(exported.signature, "base64"));
  } catch {
    return false;
  }
}
