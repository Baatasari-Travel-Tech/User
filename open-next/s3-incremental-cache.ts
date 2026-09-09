import { AwsClient } from "aws4fetch"
import { error } from "@opennextjs/aws/adapters/logger.js"
import { IgnorableError } from "@opennextjs/aws/utils/error.js"
import type {
  CacheEntryType,
  CacheValue,
  IncrementalCache,
  WithLastModified,
} from "@opennextjs/aws/types/overrides.js"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { computeCacheKey } from "@opennextjs/cloudflare/overrides/internal"

/**
 * ISR cache backed by S3.
 *
 * The adapter ships R2 and KV implementations; this is the same contract
 * pointed at an S3 bucket instead, so the cache lives in the same AWS account
 * as the event covers.
 *
 * Signing is done by aws4fetch rather than the AWS SDK — the SDK assumes Node
 * and is far too large for a Worker, while aws4fetch is a couple of kilobytes
 * of SigV4 over the standard fetch API.
 *
 * `computeCacheKey` is imported from the adapter rather than reimplemented on
 * purpose. It decides the on-disk layout, and a private copy that drifted out
 * of sync would not throw — it would just write entries under keys nothing ever
 * reads, leaving a cache that is silently, permanently useless. Importing it
 * means a change upstream breaks the build instead.
 */

const NAME = "s3-incremental-cache"

/** Set in wrangler.jsonc `vars`. */
const BUCKET_ENV = "NEXT_INC_CACHE_S3_BUCKET"
const REGION_ENV = "NEXT_INC_CACHE_S3_REGION"
const PREFIX_ENV = "NEXT_INC_CACHE_S3_PREFIX"
/** Set as Worker secrets — never in wrangler.jsonc. */
const ACCESS_KEY_ENV = "NEXT_INC_CACHE_S3_ACCESS_KEY_ID"
const SECRET_KEY_ENV = "NEXT_INC_CACHE_S3_SECRET_ACCESS_KEY"

type S3Env = Record<string, string | undefined>

class S3IncrementalCache implements IncrementalCache {
  readonly name = NAME

  private client: AwsClient | null = null

  private config() {
    const env = getCloudflareContext().env as unknown as S3Env
    const bucket = env[BUCKET_ENV]
    const region = env[REGION_ENV]
    const accessKeyId = env[ACCESS_KEY_ENV]
    const secretAccessKey = env[SECRET_KEY_ENV]

    // IgnorableError is what the built-in caches throw when their binding is
    // missing: it tells OpenNext to carry on uncached rather than fail the
    // request. A misconfigured cache should make the site slower, never broken.
    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      throw new IgnorableError(
        `S3 incremental cache is not configured — needs ${BUCKET_ENV}, ${REGION_ENV}, ${ACCESS_KEY_ENV} and ${SECRET_KEY_ENV}`,
      )
    }

    // Built once per isolate. Signing keys are derived per request by aws4fetch
    // and cached internally, so reusing the client avoids redoing that work.
    this.client ??= new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region })

    return { client: this.client, bucket, region, prefix: env[PREFIX_ENV] }
  }

  private url(key: string, cacheType: CacheEntryType | undefined, cfg: ReturnType<S3IncrementalCache["config"]>) {
    const objectKey = computeCacheKey(key, {
      prefix: cfg.prefix,
      buildId: process.env.OPEN_NEXT_BUILD_ID,
      cacheType,
    })
    return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${objectKey}`
  }

  async get<CacheType extends CacheEntryType = "cache">(
    key: string,
    cacheType?: CacheType,
  ): Promise<WithLastModified<CacheValue<CacheType>> | null> {
    const cfg = this.config()
    try {
      const res = await cfg.client.fetch(this.url(key, cacheType, cfg))
      // A miss is a 404 and completely normal — the first request for anything
      // is a miss. Only real failures are worth logging.
      if (res.status === 404) return null
      if (!res.ok) {
        error(`S3 cache get failed: ${res.status}`)
        return null
      }
      const lastModified = res.headers.get("last-modified")
      return {
        value: (await res.json()) as CacheValue<CacheType>,
        lastModified: lastModified ? new Date(lastModified).getTime() : Date.now(),
      }
    } catch (e) {
      error("Failed to get from cache", e)
      return null
    }
  }

  async set<CacheType extends CacheEntryType = "cache">(
    key: string,
    value: CacheValue<CacheType>,
    cacheType?: CacheType,
  ): Promise<void> {
    const cfg = this.config()
    try {
      const res = await cfg.client.fetch(this.url(key, cacheType, cfg), {
        method: "PUT",
        body: JSON.stringify(value),
        headers: { "content-type": "application/json" },
      })
      if (!res.ok) error(`S3 cache set failed: ${res.status}`)
    } catch (e) {
      // Swallowed, like the built-in caches: failing to WRITE the cache must
      // never fail the response that was successfully rendered.
      error("Failed to set to cache", e)
    }
  }

  async delete(key: string): Promise<void> {
    const cfg = this.config()
    try {
      const res = await cfg.client.fetch(this.url(key, undefined, cfg), { method: "DELETE" })
      // S3 returns 204 for a delete whether or not the object was there.
      if (!res.ok && res.status !== 404) error(`S3 cache delete failed: ${res.status}`)
    } catch (e) {
      error("Failed to delete from cache", e)
    }
  }
}

const s3IncrementalCache = new S3IncrementalCache()

export default s3IncrementalCache
