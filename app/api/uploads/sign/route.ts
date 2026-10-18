import { authorizeUploadRequest, jsonResponse, readSmallBody, requestError, type UploadEnvironment } from '../../../../server/http';
import { buildUploadSignature, parseUploadRequest } from '../../../../server/upload-security';

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

export async function POST(request: Request) {
  try {
    const configuration = await getEnvironment();
    const principal = await authorizeUploadRequest(request, configuration);
    const declaration = parseUploadRequest(await readSmallBody(request));
    return jsonResponse(await buildUploadSignature({ uid: principal.uid, ...declaration, env: configuration }));
  } catch (error) { return requestError(error); }
}
