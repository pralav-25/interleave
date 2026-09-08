import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/server/database';
import { investigationStore } from '@/server/investigations';
import { json, failure, readJson, requireSameOrigin } from '@/server/http';
import { updateInvestigationSchema } from '@/lib/investigations';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const user = await getChatGPTUser();
    if (!user)
      return json({ error: 'Sign in to view this investigation.' }, 401);
    const { id } = await context.params;
    return json({
      investigation: await investigationStore(database()).get(user.id, id),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await getChatGPTUser();
    if (!user) return json({ error: 'Sign in to edit investigations.' }, 401);
    const { id } = await context.params;
    const parsed = updateInvestigationSchema.safeParse(await readJson(request));
    if (!parsed.success)
      return json({ error: parsed.error.issues[0].message }, 400);
    const store = investigationStore(database());
    await store.update(user.id, id, parsed.data);
    return json({ investigation: await store.get(user.id, id) });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await getChatGPTUser();
    if (!user) return json({ error: 'Sign in to delete investigations.' }, 401);
    const { id } = await context.params;
    const version = Number(request.headers.get('if-match'));
    if (!Number.isInteger(version) || version < 1)
      return json({ error: 'A valid investigation version is required.' }, 400);
    await investigationStore(database()).delete(user.id, id, version);
    return json({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}
