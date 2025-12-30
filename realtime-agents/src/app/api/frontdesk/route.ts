import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage for prototype (replace with database in production)
interface Resident {
  id: string;
  name: string;
  roomNumber: string;
  photo: string;
  status: 'in' | 'out';
  lastCheckIn?: string;
  lastCheckOut?: string;
}

interface LogEntry {
  residentId: string;
  residentName: string;
  roomNumber: string;
  action: 'in' | 'out';
  timestamp: string;
}

// Mock resident data for prototype
// Single resident for testing
const mockResidents: Record<string, Resident> = {
  'resident-001': {
    id: 'resident-001',
    name: 'John Smith',
    roomNumber: '201',
    photo: '/residents/old man photo.avif',
    status: 'in',
    lastCheckIn: new Date().toISOString(),
  },
};

const logEntries: LogEntry[] = [];

// GET: Retrieve resident info by ID (simulating NFC/QR scan)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const residentId = searchParams.get('id');

    if (!residentId) {
      return NextResponse.json(
        { error: 'Resident ID is required' },
        { status: 400 }
      );
    }

    const resident = mockResidents[residentId];
    if (!resident) {
      return NextResponse.json(
        { error: 'Resident not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      resident: {
        id: resident.id,
        name: resident.name,
        roomNumber: resident.roomNumber,
        photo: resident.photo,
        status: resident.status,
        lastCheckIn: resident.lastCheckIn,
        lastCheckOut: resident.lastCheckOut,
      },
    });
  } catch (error: any) {
    console.error('Error fetching resident:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch resident' },
      { status: 500 }
    );
  }
}

// POST: Log in/out action
export async function POST(req: NextRequest) {
  try {
    const { residentId, action } = await req.json();

    if (!residentId || !action) {
      return NextResponse.json(
        { error: 'Resident ID and action (in/out) are required' },
        { status: 400 }
      );
    }

    if (action !== 'in' && action !== 'out') {
      return NextResponse.json(
        { error: 'Action must be "in" or "out"' },
        { status: 400 }
      );
    }

    const resident = mockResidents[residentId];
    if (!resident) {
      return NextResponse.json(
        { error: 'Resident not found' },
        { status: 404 }
      );
    }

    // Update resident status
    const timestamp = new Date().toISOString();
    if (action === 'in') {
      resident.status = 'in';
      resident.lastCheckIn = timestamp;
      resident.lastCheckOut = undefined;
    } else {
      resident.status = 'out';
      resident.lastCheckOut = timestamp;
      resident.lastCheckIn = undefined;
    }

    // Log the action
    const logEntry: LogEntry = {
      residentId: resident.id,
      residentName: resident.name,
      roomNumber: resident.roomNumber,
      action,
      timestamp,
    };
    logEntries.push(logEntry);

    return NextResponse.json({
      success: true,
      message: `${resident.name} logged ${action === 'in' ? 'in' : 'out'} successfully`,
      resident: {
        id: resident.id,
        name: resident.name,
        roomNumber: resident.roomNumber,
        status: resident.status,
        lastCheckIn: resident.lastCheckIn,
        lastCheckOut: resident.lastCheckOut,
      },
      logEntry,
    });
  } catch (error: any) {
    console.error('Error logging action:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to log action' },
      { status: 500 }
    );
  }
}

