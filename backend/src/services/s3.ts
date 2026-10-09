import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const bucketName = process.env.AWS_S3_BUCKET_NAME;

const hasExplicitCredentials =
  Boolean(process.env.AWS_ACCESS_KEY_ID) &&
  Boolean(process.env.AWS_SECRET_ACCESS_KEY);
const usesTemporaryCredentials =
  process.env.AWS_ACCESS_KEY_ID?.startsWith("ASIA") ?? false;

const s3 = new S3Client({
  region,
});

export const uploadToS3 = async (
  buffer: Buffer,
  key: string,
  contentType: string
) => {
  if (!region) {
    throw new Error("AWS_REGION is not configured");
  }

  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME is not configured");
  }



  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    })
  );

  return key;
};

export const createEvidenceDownloadUrl = async (key: string) => {
  if (!region || !bucketName) {
    throw new Error("AWS S3 configuration is incomplete");
  }

  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
    { expiresIn: 900 }
  );
};
