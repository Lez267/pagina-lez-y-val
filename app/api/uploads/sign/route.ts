import { env } from 'cloudflare:workers';
import { authorizeUploadRequest, jsonResponse, readSmallBody, requestError, type UploadEnvironment } from '../../../../server/http';
import { buildUploadSignature, parseUploadRequest } from '../../../../server/upload-security';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const configuration = env as UploadEnvironment;
    const principal = await authorizeUploadRequest(request, configuration);
    const declaration = parseUploadRequest(await readSmallBody(request));
    return jsonResponse(await buildUploadSignature({ uid: principal.uid, ...declaration, env: configuration }));
  } catch (error) { return requestError(error); }
}
