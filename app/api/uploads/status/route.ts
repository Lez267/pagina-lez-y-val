import { env } from 'cloudflare:workers';
import { getUploadStatus } from '../../../../server/upload-security';
import { jsonResponse, type UploadEnvironment } from '../../../../server/http';

export const dynamic = 'force-dynamic';
export function GET() { return jsonResponse(getUploadStatus(env as UploadEnvironment)); }
