/**
 * Content rank result handler - reads CSVs and returns analyzed pages.
 * Isolated from payload.config to avoid webpack bundling issues.
 */
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '@payload-config'
import { analyzeContent, DEFAULT_OPTIONS, type CategorizeOptions } from './content-rank-analyzer'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const CANDIDATE_PATHS = [
  ...(process.env.CSV_UPLOAD_DIR ? [() => process.env.CSV_UPLOAD_DIR!] : []),
  () => path.join(process.cwd(), 'csv-uploads'),
  () => path.join(process.cwd(), 'apps', 'cms', 'csv-uploads'),
  () => path.join(dirname, '..', 'csv-uploads'),
  () => path.join(dirname, '..', '..', 'csv-uploads'),
]

async function readCsvFile(name: string): Promise<string> {
  const errors: string[] = []
  for (const getBase of CANDIDATE_PATHS) {
    const base = getBase()
    const fullPath = path.join(base, name)
    try {
      return await fs.readFile(fullPath, 'utf-8')
    } catch (e) {
      errors.push(`${fullPath}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  throw new Error(`Could not read CSV "${name}". Tried:\n${errors.join('\n')}`)
}

const serverURL =
  process.env.PAYLOAD_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  'http://localhost:3001'

function parseOptions(searchParams: URLSearchParams): CategorizeOptions {
  const opt = (key: keyof CategorizeOptions, def: number) => {
    const v = searchParams.get(key)
    if (v === null) return def
    const n = Number(v)
    return Number.isNaN(n) ? def : n
  }
  return {
    topTrafficPercent: opt('topTrafficPercent', DEFAULT_OPTIONS.topTrafficPercent),
    nearZeroViews: opt('nearZeroViews', DEFAULT_OPTIONS.nearZeroViews),
    thinContentWords: opt('thinContentWords', DEFAULT_OPTIONS.thinContentWords),
    fewInlinks: opt('fewInlinks', DEFAULT_OPTIONS.fewInlinks),
    lowEngagementSec: opt('lowEngagementSec', DEFAULT_OPTIONS.lowEngagementSec),
  }
}

export async function handleContentRankResult(
  id: string,
  token: string,
  searchParams: URLSearchParams,
): Promise<Response> {
  const payload = await getPayload({ config })
  const doc = await payload.findByID({
    collection: 'content-rank',
    id,
    depth: 2,
    overrideAccess: true,
  })
  if (!doc || (doc as { accessToken?: string }).accessToken !== token) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (!(doc as { isActive?: boolean }).isActive) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  const d = doc as {
    screamingFrogCsv?: string | { id?: string; filename?: string; url?: string } | null
    ga4Csv?: string | { id?: string; filename?: string; url?: string } | null
  }
  async function getUpload(
    val: string | { id?: string; filename?: string; url?: string } | null | undefined,
  ): Promise<{ filename: string | null; url?: string }> {
    if (!val) return { filename: null }
    if (typeof val === 'object') {
      return { filename: val.filename ?? null, url: val.url ?? undefined }
    }
    const upload = await payload.findByID({
      collection: 'media',
      id: val,
      overrideAccess: true,
    }) as { filename?: string; url?: string } | null
    return upload
      ? { filename: upload.filename ?? null, url: upload.url ?? undefined }
      : { filename: null }
  }
  const [sfUpload, ga4Upload] = await Promise.all([
    getUpload(d.screamingFrogCsv),
    getUpload(d.ga4Csv),
  ])
  if (!sfUpload.filename || !ga4Upload.filename) {
    return Response.json(
      {
        error:
          'This Content Rank instance has no CSV files uploaded. Please upload both ScreamingFrog and GA4 CSVs in the CMS admin.',
      },
      { status: 400 },
    )
  }
  async function getCsvContent(
    upload: { filename: string | null; url?: string },
  ): Promise<string> {
    if (upload.url) {
      const fetchUrl = upload.url.startsWith('http')
        ? upload.url
        : `${serverURL}${upload.url.startsWith('/') ? '' : '/'}${upload.url}`
      const res = await fetch(fetchUrl)
      if (res.ok) return await res.text()
    }
    return readCsvFile(upload.filename!)
  }
  try {
    const [sfCsv, ga4Csv] = await Promise.all([
      getCsvContent(sfUpload),
      getCsvContent(ga4Upload),
    ])
    const options = parseOptions(searchParams)
    const ranked = analyzeContent(sfCsv, ga4Csv, options)
    return Response.json({ pages: ranked })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to read CSV files'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[content-rank-result]', msg, stack)
    return Response.json({ error: msg }, { status: 500 })
  }
}
