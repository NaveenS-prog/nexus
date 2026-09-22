import { NextRequest, NextResponse } from 'next/server';
import { parseSlotCommand } from '@/lib/parser';
import { findFirstFreeSlot } from '@/lib/calendar/slotFinder';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query || '';

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 1. Deterministic NLP parse using chrono-node
    const parsed = parseSlotCommand(query);

    if (!parsed.isSlotCommand || !parsed.targetDate) {
      return NextResponse.json({
        isSlotCommand: false,
        rawQuery: query,
        parsed,
        slot: null,
      });
    }

    // 2. Events passed in request or default empty
    const events = body.events || [];

    // 3. Run deterministic interval-gap availability search
    const slot = findFirstFreeSlot(
      events,
      parsed.targetDate,
      parsed.durationMinutes,
      parsed.taskTitle
    );

    return NextResponse.json({
      isSlotCommand: true,
      rawQuery: query,
      parsed: {
        taskTitle: parsed.taskTitle,
        targetDateFormatted: parsed.targetDateFormatted,
        targetDateLabel: parsed.targetDateLabel,
        durationMinutes: parsed.durationMinutes,
      },
      slot,
    });
  } catch (err: any) {
    console.error('Error in /api/calendar/slots:', err);
    return NextResponse.json({ error: err.message || 'Slot search failed' }, { status: 500 });
  }
}
