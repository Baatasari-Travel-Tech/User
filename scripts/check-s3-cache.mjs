// Proves the S3 incremental cache credentials work, before anything is deployed.
//
// Worth doing because a misconfigured cache is deliberately NON-FATAL: the site
// stays up and simply stops caching. That is the right behaviour in production
// and a miserable way to discover a typo, so this makes the failure loud and
// immediate instead.
//
// Does a real round trip against the real bucket — PUT, GET, DELETE — using the
// same signing path the Worker uses, then cleans up after itself.
//
// Run it (PowerShell):
//   $env:NEXT_INC_CACHE_S3_ACCESS_KEY_ID="AKIA..."
//   $env:NEXT_INC_CACHE_S3_SECRET_ACCESS_KEY="..."
//   pnpm cache:check
//
// Run it (bash):
//   NEXT_INC_CACHE_S3_ACCESS_KEY_ID=AKIA... \
//   NEXT_INC_CACHE_S3_SECRET_ACCESS_KEY=... pnpm cache:check

import { AwsClient } from "aws4fetch"

const BUCKET = process.env.NEXT_INC_CACHE_S3_BUCKET ?? "baatasari-frontend-cache"
const REGION = process.env.NEXT_INC_CACHE_S3_REGION ?? "ap-south-2"
const PREFIX = process.env.NEXT_INC_CACHE_S3_PREFIX ?? "incremental-cache"
const accessKeyId = process.env.NEXT_INC_CACHE_S3_ACCESS_KEY_ID
const secretAccessKey = process.env.NEXT_INC_CACHE_S3_SECRET_ACCESS_KEY

const die = (msg) => {
  console.error(`\n  FAILED  ${msg}\n`)
  process.exit(1)
}

if (!accessKeyId || !secretAccessKey) {
  die(
    "Set NEXT_INC_CACHE_S3_ACCESS_KEY_ID and NEXT_INC_CACHE_S3_SECRET_ACCESS_KEY first.\n" +
      "          They are read from the environment on purpose — do not paste them into a file.",
  )
}

const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: REGION })
const key = `${PREFIX}/_healthcheck/${Date.now()}.json`
const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
const payload = JSON.stringify({ check: "baatasari-isr-cache", at: new Date().toISOString() })

console.log(`\n  bucket   ${BUCKET}`)
console.log(`  region   ${REGION}`)
console.log(`  key      ${key}\n`)

// Each step maps to one IAM action, so a failure names the missing permission
// rather than just reporting "403".
const steps = [
  {
    label: "PUT    (s3:PutObject)",
    run: () =>
      client.fetch(url, {
        method: "PUT",
        body: payload,
        headers: { "content-type": "application/json" },
      }),
  },
  {
    label: "GET    (s3:GetObject)",
    run: () => client.fetch(url),
    check: async (res) => {
      const body = await res.text()
      if (body !== payload) throw new Error("returned different bytes than were written")
    },
  },
  {
    label: "DELETE (s3:DeleteObject)",
    run: () => client.fetch(url, { method: "DELETE" }),
  },
]

for (const step of steps) {
  let res
  try {
    res = await step.run()
  } catch (e) {
    die(`${step.label} — could not reach S3: ${e.message}`)
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    const hint =
      res.status === 403
        ? "the IAM policy is missing this action, or the keys belong to another user"
        : res.status === 404
          ? "the bucket name or region does not match what you created"
          : res.status === 301
            ? "wrong region for this bucket"
            : "see the S3 error below"
    die(`${step.label} — HTTP ${res.status}. Likely: ${hint}\n\n${detail.trim().slice(0, 400)}`)
  }

  if (step.check) {
    try {
      await step.check(res)
    } catch (e) {
      die(`${step.label} — ${e.message}`)
    }
  }

  console.log(`  ok  ${step.label}`)
}

console.log(`
  All three permissions work and the round trip is byte-identical.

  These exact values go into Cloudflare (step 4 of DEPLOY-CLOUDFLARE.md):
    NEXT_INC_CACHE_S3_ACCESS_KEY_ID       as a secret
    NEXT_INC_CACHE_S3_SECRET_ACCESS_KEY   as a secret
`)
