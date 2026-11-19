import type { S3Client } from "@aws-sdk/client-s3";
import { assertValidKey, isValidKey } from "../keys.js";
import { BlobExistsError, StorageConfigError, type BlobStore, type Env, type StorageDriver } from "../types.js";

export interface S3Options {
  bucket: string;
  region?: string;
  /** Key prefix acting as a folder, e.g. `poems/`. */
  prefix?: string;
  /** Custom endpoint for S3-compatible services (Cloudflare R2, MinIO, ...). */
  endpoint?: string;
  forcePathStyle?: boolean;
}

/**
 * Credentials are never passed in here. The AWS SDK's default provider chain
 * picks them up from the environment, a shared profile, or an attached IAM
 * role, so short-lived role credentials work without code changes.
 */
export function createS3Store(options: S3Options): BlobStore {
  const prefix = normalizePrefix(options.prefix);
  let client: Promise<{ s3: S3Client; sdk: typeof import("@aws-sdk/client-s3") }> | undefined;

  // The SDK loads on first use, so deployments on other drivers never pay for it.
  const connect = () =>
    (client ??= loadSdk().then((sdk) => ({
      sdk,
      s3: new sdk.S3Client({
        region: options.region,
        endpoint: options.endpoint,
        forcePathStyle: options.forcePathStyle,
      }),
    })));

  return {
    driver: "s3",

    async list() {
      const { s3, sdk } = await connect();
      const keys: string[] = [];
      let token: string | undefined;
      do {
        const page = await s3.send(
          new sdk.ListObjectsV2Command({ Bucket: options.bucket, Prefix: prefix, ContinuationToken: token }),
        );
        for (const object of page.Contents ?? []) {
          const key = object.Key?.slice(prefix.length);
          if (key && isValidKey(key)) keys.push(key);
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
      return keys;
    },

    async read(key) {
      const { s3, sdk } = await connect();
      try {
        const object = await s3.send(
          new sdk.GetObjectCommand({ Bucket: options.bucket, Key: prefix + assertValidKey(key) }),
        );
        return (await object.Body?.transformToString("utf-8")) ?? "";
      } catch (error) {
        if (error instanceof sdk.NoSuchKey) return null;
        throw error;
      }
    },

    async write(key, body, { overwrite = false } = {}) {
      const { s3, sdk } = await connect();
      try {
        await s3.send(
          new sdk.PutObjectCommand({
            Bucket: options.bucket,
            Key: prefix + assertValidKey(key),
            Body: body,
            ContentType: "text/markdown; charset=utf-8",
            // Conditional write: S3 rejects the request if the key exists, atomically.
            IfNoneMatch: overwrite ? undefined : "*",
          }),
        );
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        // 412: key exists. 409: a concurrent conditional write to the same key won.
        if (!overwrite && (status === 412 || status === 409)) throw new BlobExistsError(key);
        throw error;
      }
    },
  };
}

/** The SDK is an optional peer dependency: say how to fix it instead of "module not found". */
async function loadSdk(): Promise<typeof import("@aws-sdk/client-s3")> {
  try {
    return await import("@aws-sdk/client-s3");
  } catch (error) {
    if (error instanceof Error && /needs the AWS SDK/.test(error.message)) throw error;
    throw new StorageConfigError(
      "The s3 storage driver needs the AWS SDK. Install it in your site: bun add @aws-sdk/client-s3",
    );
  }
}

function normalizePrefix(prefix?: string): string {
  if (!prefix) return "";
  const trimmed = prefix.replace(/^\/+|\/+$/g, "");
  if (trimmed.split("/").some((part) => !isValidKey(part))) {
    throw new StorageConfigError(`Invalid S3 prefix: ${JSON.stringify(prefix)}`);
  }
  return `${trimmed}/`;
}

/**
 * S3 options from the environment, with explicit values taking precedence.
 * The region falls back to the AWS SDK's own resolution (AWS_REGION, profile).
 */
export function resolveS3Options(env: Env, overrides: Partial<S3Options> = {}): S3Options {
  const given = Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined));
  const options: Partial<S3Options> = {
    bucket: env.TERCET_S3_BUCKET,
    region: env.TERCET_S3_REGION,
    prefix: env.TERCET_S3_PREFIX,
    endpoint: env.TERCET_S3_ENDPOINT,
    forcePathStyle: env.TERCET_S3_FORCE_PATH_STYLE === "true",
    ...given,
  };
  if (!options.bucket) throw new StorageConfigError("The s3 driver needs a bucket: set TERCET_S3_BUCKET or pass { bucket }.");
  return options as S3Options;
}

export const s3Driver: StorageDriver<S3Options> = {
  name: "s3",
  optionsFromEnv: (env) => resolveS3Options(env),
  create: createS3Store,
  detect: (env) => Boolean(env.TERCET_S3_BUCKET),
  // s3://bucket or s3://bucket/prefix
  parseLocation(location, env) {
    const match = /^s3:\/\/([^/]+)(?:\/(.+))?$/.exec(location);
    return match ? resolveS3Options(env, { bucket: match[1], prefix: match[2] }) : null;
  },
};
