import { useState, useCallback, useMemo } from 'react';
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  Views,
  type View,
  type SlotInfo,
  type EventProps,
} from 'react-big-calendar';
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  AlertTriangle,
  LayoutGrid,
} from 'lucide-react';

import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useBookings, type Booking } from '../hooks/useBookings';
import BookingEventCard, { getStaffColorIndex, STAFF_COLORS } from '../components/BookingEventCard';
import BookingDetailModal from '../components/BookingDetailModal';
import BookingModal from '../components/BookingModal';

// ─── date-fns localizer ───────────────────────────────────────────────────────

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

// ─── Calendar event type ──────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Booking;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDateTime(date: string, time: string): Date {
  try {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute);
  } catch {
    return new Date();
  }
}

function bookingToEvent(booking: Booking): CalendarEvent {
  const start = parseDateTime(booking.date, booking.startTime);
  const end   = booking.endTime
    ? parseDateTime(booking.date, booking.endTime)
    : new Date(start.getTime() + 60 * 60 * 1000); // default 1h

  const customerName = booking.customer?.name ?? 'Unknown';
  const serviceName  = booking.service?.name ?? 'Service';

  return {
    id: booking.id,
    title: `${customerName} — ${serviceName}`,
    start,
    end,
    resource: booking,
  };
}

// Build a stable staff → color-index map from the loaded bookings
function buildStaffColorMap(bookings: Booking[]): Map<string, number> {
  const map = new Map<string, number>();
  let idx = 0;
  for (const b of bookings) {
    const sid = b.staff?.id;
    if (sid && !map.has(sid)) {
      map.set(sid, idx % 8);
      idx++;
    }
  }
  return map;
}

// ─── Custom toolbar ───────────────────────────────────────────────────────────

const VIEW_LABELS: Record<View, string> = {
  month: 'Month',
  week:  'Week',
  day:   'Day',
  agenda: 'Agenda',
  work_week: 'Work Week',
};

const SUPPORTED_VIEWS: View[] = ['month', 'week', 'day'];

// ─── Main component ───────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [view, setView]           = useState<View>(Views.WEEK);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNewModal, setShowNewModal]       = useState(false);
  const [newModalDate, setNewModalDate]       = useState<Date | undefined>();
  const [newModalTime, setNewModalTime]       = useState<string | undefined>();
  const [editingBooking, setEditingBooking]   = useState<Booking | null>(null);

  // Compute date range to query based on current view
  const { startDate, endDate } = useMemo(() => {
    if (view === Views.MONTH) {
      return {
        startDate: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
        endDate:   format(endOfMonth(currentDate),   'yyyy-MM-dd'),
      };
    }
    if (view === Views.WEEK) {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      return {
        startDate: format(weekStart,             'yyyy-MM-dd'),
        endDate:   format(addDays(weekStart, 6), 'yyyy-MM-dd'),
      };
    }
    // Day view
    return {
      startDate: format(startOfDay(currentDate), 'yyyy-MM-dd'),
      endDate:   format(endOfDay(currentDate),   'yyyy-MM-dd'),
    };
  }, [view, currentDate]);

  const bookingsQuery = useBookings({ startDate, endDate, limit: 200 });
  const bookings: Booking[] = bookingsQuery.data?.appointments ?? [];

  // Build staff color map
  const staffColorMap = useMemo(() => buildStaffColorMap(bookings), [bookings]);

  // Map bookings → calendar events
  const events: CalendarEvent[] = useMemo(
    () => bookings.map(bookingToEvent),
    [bookings]
  );

  // ── Navigation ──────────────────────────────────────────────────────────────

  const navigate = useCallback(
    (direction: 'prev' | 'next' | 'today') => {
      setCurrentDate((d) => {
        if (direction === 'today') return new Date();
        if (view === Views.MONTH) {
          return direction === 'next' ? addMonths(d, 1) : subMonths(d, 1);
        }
        if (view === Views.WEEK) {
          return direction === 'next' ? addWeeks(d, 1) : subWeeks(d, 1);
        }
        return direction === 'next' ? addDays(d, 1) : subDays(d, 1);
      });
    },
    [view]
  );

  const toolbarTitle = useMemo(() => {
    if (view === Views.MONTH) return format(currentDate, 'MMMM yyyy');
    if (view === Views.WEEK) {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth()) {
        return `${format(ws, 'MMM d')} – ${format(we, 'd, yyyy')}`;
      }
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  }, [view, currentDate]);

  // ── Event interactions ──────────────────────────────────────────────────────

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedBooking(event.resource);
    setShowDetailModal(true);
  }, []);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setNewModalDate(slotInfo.start);
    const h = slotInfo.start.getHours();
    const m = slotInfo.start.getMinutes();
    // Round to nearest 30-min slot
    const roundedM = m < 30 ? 0 : 30;
    setNewModalTime(`${String(h).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`);
    setEditingBooking(null);
    setShowNewModal(true);
  }, []);

  const handleEdit = useCallback((booking: Booking) => {
    setEditingBooking(booking);
    setShowNewModal(true);
  }, []);

  const handleNewBooking = () => {
    setNewModalDate(undefined);
    setNewModalTime(undefined);
    setEditingBooking(null);
    setShowNewModal(true);
  };

  // ── Custom event renderer ───────────────────────────────────────────────────

  const EventComponent = useCallback(
    ({ event }: EventProps<CalendarEvent>) => {
      const booking = event.resource;
      const staffId = booking.staff?.id ?? '';
      const colorIdx = staffColorMap.get(staffId) ?? getStaffColorIndex(staffId);
      return (
        <BookingEventCard
          booking={booking}
          staffColorIndex={colorIdx}
          compact={view === Views.MONTH}
        />
      );
    },
    [staffColorMap, view]
  );

  // ── Event style getter ──────────────────────────────────────────────────────

  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const booking = event.resource;
      const staffId = booking.staff?.id ?? '';
      void (staffColorMap.get(staffId) ?? getStaffColorIndex(staffId));
      const isCancelled = booking.status === 'cancelled';

      // We override bg color so react-big-calendar doesn't add its own color layer
      return {
        style: {
          background: 'transparent',
          border: 'none',
          padding: 0,
          opacity: isCancelled ? 0.6 : 1,
        },
        className: '',
      };
    },
    [staffColorMap]
  );

  // ── Staff legend ────────────────────────────────────────────────────────────

  const staffLegend = useMemo(() => {
    const entries: { staffId: string; name: string; colorIdx: number }[] = [];
    for (const b of bookings) {
      if (b.staff?.id && !entries.find((e) => e.staffId === b.staff.id)) {
        entries.push({
          staffId: b.staff.id,
          name: b.staff.name,
          colorIdx: staffColorMap.get(b.staff.id) ?? 0,
        });
      }
    }
    return entries;
  }, [bookings, staffColorMap]);

  return (
    <div className="flex flex-col h-full space-y-4 min-h-0">
      {/* Page header */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
          <CalendarDays size={20} className="text-primary-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Bookings</h2>
          <p className="text-sm text-gray-500">Schedule and manage appointments</p>
        </div>
      </div>

      {/* Calendar card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('prev')}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              title="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => navigate('today')}
              className="px-3 h-8 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigate('next')}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              title="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-gray-800 flex-1 text-center sm:text-left">
            {toolbarTitle}
          </h3>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {SUPPORTED_VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 h-7 text-xs font-semibold rounded-md transition-all ${
                  view === v
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>

          {/* New booking */}
          <button
            onClick={handleNewBooking}
            className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3 h-8"
          >
            <Plus size={15} />
            New Booking
          </button>
        </div>

        {/* Loading / Error / Legend strip */}
        {(bookingsQuery.isLoading || bookingsQuery.isError || staffLegend.length > 0) && (
          <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-50 bg-gray-50/60 flex-shrink-0 overflow-x-auto">
            {bookingsQuery.isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 size={12} className="animate-spin" />
                Loading…
              </div>
            )}
            {bookingsQuery.isError && !bookingsQuery.isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertTriangle size={12} />
                Failed to load bookings
              </div>
            )}
            {!bookingsQuery.isLoading && staffLegend.map((entry) => {
              const palette = STAFF_COLORS[entry.colorIdx % 8];
              return (
                <div key={entry.staffId} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${palette.bg}`} />
                  <span className="text-xs text-gray-600 whitespace-nowrap">{entry.name}</span>
                </div>
              );
            })}
            {!bookingsQuery.isLoading && staffLegend.length === 0 && !bookingsQuery.isError && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <LayoutGrid size={12} />
                No bookings in this period
              </div>
            )}
          </div>
        )}

        {/* Calendar body */}
        <div className="flex-1 min-h-0 p-2">
          <BigCalendar<CalendarEvent>
            localizer={localizer}
            events={events}
            view={view}
            date={currentDate}
            onNavigate={(date) => setCurrentDate(date)}
            onView={(v) => setView(v)}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            components={{
              event: EventComponent,
            }}
            eventPropGetter={eventStyleGetter}
            style={{ height: '100%' }}
            popup
            formats={{
              timeGutterFormat: (date: Date) => format(date, 'h a'),
              eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                `${format(start, 'h:mm')} – ${format(end, 'h:mm a')}`,
            }}
            min={new Date(2000, 0, 1, 8, 0, 0)}
            max={new Date(2000, 0, 1, 20, 0, 0)}
          />
        </div>
      </div>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedBooking(null); }}
        booking={selectedBooking}
        onEdit={(b) => {
          setShowDetailModal(false);
          handleEdit(b);
        }}
      />

      {/* New / Edit Booking Modal */}
      <BookingModal
        isOpen={showNewModal}
        onClose={() => { setShowNewModal(false); setEditingBooking(null); }}
        initialDate={newModalDate}
        initialTime={newModalTime}
        existingBooking={editingBooking}
      />
    </div>
  );
}
