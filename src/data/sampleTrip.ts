import { mapsSearchUrl, type TripDay, type TripEvent, type TripSnapshot } from '../domain/trip'

const stop = (
  id: string,
  date: string,
  order: number,
  title: string,
  timeLabel = '',
  options: Partial<Omit<TripEvent, 'id' | 'date' | 'order' | 'title' | 'timeLabel'>> = {},
): TripEvent => {
  const place = options.place ?? ''
  return {
    id,
    date,
    order,
    title,
    timeLabel,
    place,
    notes: '',
    travelMinutes: null,
    mapsUrl: mapsSearchUrl(place || title),
    websiteUrl: null,
    revision: 1,
    comments: [],
    ...options,
  }
}

const days: TripDay[] = [
  {
    date: '2026-09-19',
    shortLabel: 'Sep 19',
    weekday: 'Saturday',
    events: [
      stop('arrival', '2026-09-19', 1, 'Dallas arrival', '6 a.m.', { place: 'Dallas, TX' }),
      stop('home-sat-am', '2026-09-19', 2, 'Home', '7:30 a.m.', {
        travelMinutes: 20,
        mapsUrl: null,
      }),
      stop('in-n-out', '2026-09-19', 3, 'In-N-Out', '9 a.m.', {
        place: 'In-N-Out Burger',
      }),
      stop('fort-worth', '2026-09-19', 4, 'Fort Worth', '10:30 a.m.', {
        place: 'Fort Worth Stockyards',
        notes: "Stockyards · Cavender's Stock Yards · 소몰이 구경",
        travelMinutes: 50,
      }),
      stop('bowling', '2026-09-19', 5, 'Bowling', '2 p.m.', { travelMinutes: 50 }),
      stop('home-sat-pm', '2026-09-19', 6, 'Home', '5 p.m.', {
        notes: '밥(고기) / 수영장 / 라운지',
        mapsUrl: null,
      }),
      stop('truckyard', '2026-09-19', 7, 'Truck Yard', '9 p.m.', {
        place: 'Truck Yard, Dallas',
      }),
    ],
  },
  {
    date: '2026-09-20',
    shortLabel: 'Sep 20',
    weekday: 'Sunday',
    events: [
      stop('morning-workout', '2026-09-20', 1, '아침 운동'),
      stop('home-sun', '2026-09-20', 2, 'Home', '9 a.m.', { mapsUrl: null }),
      stop('bucees', '2026-09-20', 3, "Denton Buc-ee's", '', {
        place: "Buc-ee's, Denton",
        notes: 'Brisket',
      }),
      stop('winstar', '2026-09-20', 4, 'WinStar Casino', '10:30 a.m.', {
        place: 'WinStar World Casino and Resort',
      }),
      stop('hutchins', '2026-09-20', 5, 'Hutchins', '4 p.m. - 5 p.m.', {
        place: 'Hutchins BBQ',
      }),
      stop('karaoke', '2026-09-20', 6, 'Carrollton 노래방', '6 p.m. - 8 p.m.', {
        place: 'Carrollton, TX karaoke',
      }),
      stop('home-drinks', '2026-09-20', 7, '집와서 와인 / 안주 / 소주', '10pm - 7pm', {
        notes: '대충 / 암거나',
        mapsUrl: null,
      }),
    ],
  },
  {
    date: '2026-09-21',
    shortLabel: 'Sep 21',
    weekday: 'Monday',
    events: [
      stop('tex-mex', '2026-09-21', 1, 'Uptown Tex-Mex', '11:30 p.m.', {
        place: 'Uptown Dallas Tex-Mex',
      }),
      stop('att-discovery', '2026-09-21', 2, 'AT&T Discovery District', '', {
        place: 'AT&T Discovery District',
      }),
      stop('coffee', '2026-09-21', 3, 'Coffee', '3 p.m.', {
        place: 'Downtown Dallas coffee',
      }),
      stop('las-colinas', '2026-09-21', 4, 'Las Colinas', '', {
        place: 'Las Colinas, Irving',
        notes: '마지막 산책',
      }),
    ],
  },
]

export const sampleTrip: TripSnapshot = {
  id: 'dallas-2026',
  title: 'Dallas Weekend',
  destination: 'Dallas–Fort Worth, Texas',
  dateRange: 'September 19–21, 2026',
  timezone: 'America/Chicago',
  days,
}

export const sampleShareToken = 'demo-dallas-2026'
