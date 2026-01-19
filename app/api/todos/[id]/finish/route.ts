import { NextRequest, NextResponse } from 'next/server';
import { updateTodo } from '../../db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[API] PATCH /api/todos/[id]/finish - Request received for id:', params.id);
  try {
    const todo = await updateTodo(params.id, { finished: true });
    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }
    console.log('[API] Todo marked as finished successfully');
    return NextResponse.json({ todo });
  } catch (error) {
    console.error('[API] Error finishing todo:', error);
    return NextResponse.json(
      { error: 'Failed to finish todo' },
      { status: 500 }
    );
  }
}
