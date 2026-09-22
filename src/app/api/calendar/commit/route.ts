import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskTitle, start, end } = body;

    if (!taskTitle || !start) {
      return NextResponse.json(
        { error: 'taskTitle and start datetime are required' },
        { status: 400 }
      );
    }

    const task = {
      id: `task-${Date.now()}`,
      title: taskTitle,
      source: 'google_tasks',
      category: 'personal',
      priority: 'high',
      status: 'pending',
      dueAt: start,
      estimatedMinutes: 60,
    };

    const event = {
      id: `cal-${Date.now()}`,
      title: `Focus: ${taskTitle}`,
      source: 'google_calendar',
      category: 'calendar',
      priority: 'medium',
      status: 'pending',
      startAt: start,
      dueAt: end,
      estimatedMinutes: 60,
    };

    return NextResponse.json({
      success: true,
      task,
      event,
      message: `Scheduled '${taskTitle}' for ${new Date(start).toLocaleString()}`,
    });
  } catch (err: any) {
    console.error('Error in /api/calendar/commit:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to commit scheduled slot' },
      { status: 500 }
    );
  }
}
