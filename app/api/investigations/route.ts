import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/server/database';
import { investigationStore } from '@/server/investigations';
import { json, failure, readJson, requireSameOrigin } from '@/server/http';
import { createInvestigationSchema } from '@/lib/investigations';
export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return json({ error: 'Sign in to view your workspace.' }, 401);
    return json({
      investigations: await investigationStore(database()).list(user.id),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getChatGPTUser();
    if (!user) return json({ error: 'Sign in to save investigations.' }, 401);
    const parsed = createInvestigationSchema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: parsed.error.issues[0].message }, 400);
    return json(
      {
        investigation: await investigationStore(database()).create(
          user.id,
          parsed.data,
        ),
      },
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
