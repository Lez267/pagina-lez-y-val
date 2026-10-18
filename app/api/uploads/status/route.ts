import { getUploadStatus } from '../../../../server/upload-security';
import { jsonResponse, type UploadEnvironment } from '../../../../server/http';

export const dynamic = 'force-dynamic';

async function getEnvironment(): Promise<UploadEnvironment> {
  try {
    const modName = 'cloudflare:workers';
    const cf = await import(/* webpackIgnore: true */ modName);
    if (cf && cf.env) return cf.env as UploadEnvironment;
  } catch {
    // Running in Node / Vercel environment
  }
  return (typeof process !== 'undefined' ? process.env : {}) as unknown as UploadEnvironment;
}

export async function GET() {
  const configuration = await getEnvironment();
  return jsonResponse(getUploadStatus(configuration));
}
