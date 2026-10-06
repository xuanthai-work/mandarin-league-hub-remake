import { z } from "zod";

export const verificationCodeSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập mã xác minh.")
  .max(50, "Mã xác minh không được vượt quá 50 ký tự.")
  .regex(/^[A-Za-z0-9-]+$/, "Mã chỉ được gồm chữ cái, chữ số và dấu gạch ngang.")
  .transform((value) => value.toUpperCase());

export type VerificationStatus = "VALID" | "REVOKED";

export interface CertificateRecord {
  kind: "certificate";
  verificationId: string;
  holderName: string;
  courseName: string;
  level: string;
  issueDate: string;
  status: VerificationStatus;
  issuer: string;
}

export interface HskRecord {
  kind: "hsk";
  verificationId: string;
  candidateName?: string;
  examLevel: string;
  examDate: string;
  listeningScore?: number;
  readingScore?: number;
  writingScore?: number;
  totalScore?: number;
  maximumScore: number;
  status: VerificationStatus;
  issuer: string;
}

export type VerificationRecord = CertificateRecord | HskRecord;

export const DEMO_CODES = {
  certificate: "TML-CERT-2026-000128",
  hsk: "HSK-TML-2026-000128",
} as const;

const certificateRecords: CertificateRecord[] = [
  {
    kind: "certificate",
    verificationId: DEMO_CODES.certificate,
    holderName: "Nguyễn Văn A",
    courseName: "Khóa học HSK 4",
    level: "Hoàn thành",
    issueDate: "2026-10-06",
    status: "VALID",
    issuer: "The Mandarin League",
  },
  {
    kind: "certificate",
    verificationId: "TML-CERT-2026-000099",
    holderName: "",
    courseName: "Chứng nhận hoạt động TML",
    level: "Đã thu hồi",
    issueDate: "2026-08-20",
    status: "REVOKED",
    issuer: "The Mandarin League",
  },
];

const hskRecords: HskRecord[] = [
  {
    kind: "hsk",
    verificationId: DEMO_CODES.hsk,
    candidateName: "Nguyễn Văn A",
    examLevel: "HSK 4",
    examDate: "2026-10-06",
    listeningScore: 82,
    readingScore: 88,
    writingScore: 76,
    totalScore: 246,
    maximumScore: 300,
    status: "VALID",
    issuer: "Đơn vị tổ chức kỳ thi (dữ liệu minh họa)",
  },
  {
    kind: "hsk",
    verificationId: "HSK-TML-2026-000099",
    examLevel: "HSK 4",
    examDate: "2026-08-20",
    maximumScore: 300,
    status: "REVOKED",
    issuer: "Đơn vị tổ chức kỳ thi (dữ liệu minh họa)",
  },
];

export function findVerificationRecord(kind: VerificationRecord["kind"], code: string) {
  const records = kind === "hsk" ? hskRecords : certificateRecords;
  return records.find((record) => record.verificationId === code);
}

export function formatVerificationDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}