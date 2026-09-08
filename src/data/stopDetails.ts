import { mapsSearchUrl } from '../domain/trip'

export type StopDetails = {
  price: string
  priceNote: string
  priceKind: 'estimate' | 'published' | 'personal'
  mapQuery?: string
  mapNote?: string
  website?: string
  source?: { label: string; url: string }
  tip?: string
}

const home: StopDetails = {
  price: 'No activity fee', priceKind: 'personal',
  priceNote: 'Food, drinks, and shared groceries are separate. Confirm the split with your host.',
  mapNote: 'Home address needed — ask your host for the pin.',
}

// Planning estimates are ours, not venue quotes. Published references checked 2026-09-08.
export const stopDetails: Record<string, StopDetails> = {
  arrival: { price: 'Travel booked separately', priceKind: 'personal', priceNote: 'Flight and airport transport are not included.', mapQuery: 'Dallas Texas airports', mapNote: 'Airport not specified. Confirm DFW or Dallas Love Field before heading out.' },
  'home-sat-am': home,
  'in-n-out': { price: '$10–15 / person', priceKind: 'estimate', priceNote: 'Meal budget estimate before tax; exact branch and order still to be chosen.', mapQuery: 'In-N-Out Burger Dallas Fort Worth Texas', mapNote: 'Choose the branch that fits the route.', website: 'https://www.in-n-out.com/locations', tip: 'Check opening time: the plan says 9 a.m.; published opening is 10:30 a.m.', source: { label: 'In-N-Out opening hours', url: 'https://www.in-n-out.com/mediakit/?lv=true' } },
  'fort-worth': { price: 'Free cattle drive', priceKind: 'published', priceNote: 'Cattle drive viewing is free. Parking, shopping at Cavender’s, and other attractions cost extra.', mapQuery: 'Livestock Exchange Building 131 E Exchange Ave Fort Worth TX', website: 'https://www.fortworthstockyards.org/', source: { label: 'Stockyards visitor information', url: 'https://www.fortworthstockyards.org/faq/cattle-drive-times-locations' }, tip: 'Arrive for the 11:30 a.m. cattle drive, weather permitting. The second drive is at 4 p.m.' },
  bowling: { price: '$20–35 / person', priceKind: 'estimate', priceNote: 'Planning allowance for bowling and shoe hire; venue, game count, and lane split are unconfirmed.', mapQuery: 'bowling Dallas Fort Worth Texas', mapNote: 'Venue to be chosen — this opens an area search.' },
  'home-sat-pm': { ...home, price: 'Groceries to split' },
  truckyard: { price: '$20–40 / person', priceKind: 'estimate', priceNote: 'Food and drink allowance before tax and tip; actual spending depends on your order.', mapQuery: 'Truck Yard 5624 Sears St Dallas TX 75206', website: 'https://truckyard.com/dallas/', source: { label: 'Truck Yard Dallas venue & menus', url: 'https://truckyard.com/dallas/' } },
  'morning-workout': { price: 'Budget to confirm', priceKind: 'personal', priceNote: 'A home or outdoor workout may have no fee; gym access depends on the location.', mapNote: 'Workout location not specified.' },
  'home-sun': home,
  bucees: { price: '$12–20 / person', priceKind: 'estimate', priceNote: 'Brisket sandwich and snack allowance; not a published menu price.', mapQuery: "Buc-ee's 2800 S Interstate 35 E Denton TX 76210", website: 'https://buc-ees.com/', source: { label: 'Buc-ee’s Denton location', url: 'https://buc-ees.com/locations/' } },
  winstar: { price: 'Your own spending limit', priceKind: 'personal', priceNote: 'Gaming, food, and any ticketed entertainment are separate. Decide your own limit before visiting.', mapQuery: 'WinStar World Casino 777 Casino Ave Thackerville OK', website: 'https://www.winstar.com/', source: { label: 'WinStar visitor information', url: 'https://www.winstar.com/footer/frequently-asked-questions/' } },
  hutchins: { price: '$25–40 / person', priceKind: 'estimate', priceNote: 'Meal estimate before tax. Reference: Frisco lists prime brisket at $41.99/lb and a brisket sandwich at $18.49. Branch is not yet selected.', mapQuery: 'Hutchins BBQ Frisco McKinney Texas', mapNote: 'Confirm Frisco or McKinney with the group.', website: 'https://hutchinsbbq.com/', source: { label: 'Hutchins Frisco menu (price reference)', url: 'https://hutchinsbbq.com/frisco-menu/' } },
  karaoke: { price: '$20–40 / person', priceKind: 'estimate', priceNote: 'Estimated share of a two-hour room booking; venue, group size, and drinks will change the total.', mapQuery: 'Korean karaoke Carrollton TX', mapNote: 'Room and venue still to be booked.' },
  'home-drinks': { ...home, price: 'Drinks & snacks to split', tip: 'Confirm the time: “10pm - 7pm” is preserved from the original plan.' },
  'tex-mex': { price: '$20–35 / person', priceKind: 'estimate', priceNote: 'Meal allowance before tax and tip. Restaurant has not been selected.', mapQuery: 'Tex Mex Uptown Dallas TX', mapNote: 'Restaurant to be chosen.', tip: 'Confirm a.m. or p.m.: the original plan says 11:30 p.m.' },
  'att-discovery': { price: '$0–15 planned', priceKind: 'estimate', priceNote: 'Allowance for exploring and an optional snack; check venue details for paid events and parking.', mapQuery: 'AT&T Discovery District 208 S Akard St Dallas TX', website: 'https://discoverydistrict.att.com/', source: { label: 'Discovery District visitor information', url: 'https://discoverydistrict.att.com/' } },
  coffee: { price: '$5–10 / person', priceKind: 'estimate', priceNote: 'Drink allowance before tax and tip; café to be chosen.', mapQuery: 'coffee Downtown Dallas TX', mapNote: 'Café to be chosen — this opens an area search.' },
  'las-colinas': { price: '$0–10 planned', priceKind: 'estimate', priceNote: 'Walking and optional parking allowance; route and parking to be confirmed.', mapQuery: 'Las Colinas Irving TX', mapNote: 'Choose a meeting pin for the final walk.', website: 'https://lascolinas.org/' },
}

export function detailsForStop(id: string): StopDetails {
  return stopDetails[id] ?? { price: 'Budget to confirm', priceKind: 'personal', priceNote: 'Ask the group about the expected cost.' }
}

export function mapForStop(id: string, fallback: string | null): string | null {
  const details = stopDetails[id]
  if (details) return details.mapQuery ? mapsSearchUrl(details.mapQuery) : null
  return fallback && /^https?:\/\//i.test(fallback) ? fallback : null
}
