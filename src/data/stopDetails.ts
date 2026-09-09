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
  arrival: { price: 'Travel booked separately', priceKind: 'personal', priceNote: '여권같은거 잊지 말고 잘 챙기기.', mapQuery: 'DFW', mapNote: '비행기 표 알아보고 출국날짜 여기나 카톡에 남겨줘' },
  'home-sat-am': home,
  'in-n-out': { price: '$15–20 / person', priceKind: 'estimate', priceNote: '현금밖에 결제 안되면 현금 주고 우리가 카드로 결재할게', mapQuery: 'In-N-Out Burger', mapNote: '오픈이 10시 30분이라서 포트워스쪽에서 먹어야 할듯', website: 'https://www.in-n-out.com/locations', tip: '9시에 먹으려고 했는데 10시 30분이라서, 먹을거면 이동중에 도착지에서 먹어야함' },
  'fort-worth': { price: 'Free cattle drive', priceKind: 'published', priceNote: '소떼몰이 보는건 무료구경이야. 가죽접 Cavender’s에서 살거면 사는데 개비싸니까 구경만 추천', mapQuery: 'Livestock Exchange Building 131 E Exchange Ave Fort Worth TX', website: 'https://www.fortworthstockyards.org/', source: { label: 'Stockyards visitor information', url: 'https://www.fortworthstockyards.org/faq/cattle-drive-times-locations' }, tip: 'Arrive for the 11:30 a.m. cattle drive, weather permitting. The second drive is at 4 p.m.' },
  bowling: { price: '$20–35 / person', priceKind: 'estimate', priceNote: '이왕 칠거면 시설 좋은데서 치려고 해서 인당 25불 잡았어.(2시간) 만약에 좀 꾸진데 괜찮으면 아낄 수 있음', mapQuery: 'bowling Dallas Fort Worth Texas' },
  'home-sat-pm': { ...home, price: 'Groceries to split' },
  truckyard: { price: '$20–40 / person', priceKind: 'estimate', priceNote: '맥주만 간단히 기분내게 마실 예정. 먹을것도 파니까 출출하면 사드셈', mapQuery: 'Truck Yard 5624 Sears St Dallas TX 75206', website: 'https://truckyard.com/dallas/', source: { label: 'Truck Yard Dallas venue & menus', url: 'https://truckyard.com/dallas/' } },
  'morning-workout': { price: '$0', priceKind: 'personal', priceNote: '집헬스장 이용할거야', mapNote: '집' },
  'home-sun': home,
  bucees: { price: '$12–20 / person', priceKind: 'estimate', priceNote: '브리스킷 샌드위치가 유명해. 다른 잡화나 기념품은 여기서 사도 좋아. 그럼 돈 더 많이 나갈 예정', mapQuery: "Buc-ee's 2800 S Interstate 35 E Denton TX 76210", website: 'https://buc-ees.com/', source: { label: 'Buc-ee’s Denton location', url: 'https://buc-ees.com/locations/' } },
  winstar: { price: '$50~$100', priceKind: 'personal', priceNote: '$100는 써야 슬롯을 해도 좀 놀 순 있어. 슬롯 베팅금은 $0.8-$2. 테이블 게임이나 홀짝은 비쌈', mapQuery: 'WinStar World Casino 777 Casino Ave Thackerville OK', website: 'https://www.winstar.com/', source: { label: 'WinStar visitor information', url: 'https://www.winstar.com/footer/frequently-asked-questions/' } },
  hutchins: { price: '제공 / person', priceKind: 'estimate', priceNote: '저녁 제공', mapQuery: 'Hutchins BBQ Frisco McKinney Texas', mapNote: 'Confirm Frisco or McKinney with the group.', website: 'https://hutchinsbbq.com/', source: { label: 'Hutchins Frisco menu (price reference)', url: 'https://hutchinsbbq.com/frisco-menu/' } },
  karaoke: { price: '$20–40 / person', priceKind: 'estimate', priceNote: '2시간정도 잡을 예정. 완전 한국 노래방이고 후불이니까 시간계산 잘해', mapQuery: 'Korean karaoke Carrollton TX', mapNote: '...' },
  'home-drinks': { ...home, price: '집에 있는거로 먹을건데 더 먹을거면 근처 마트에서 장보자', tip: '오래 대화하게 에너지 드링크 먹자' },
  'tex-mex': { price: '$20–35 / person', priceKind: 'estimate', priceNote: '유명한데인데 마지막날이니까 간단히 먹자', mapQuery: 'Tex Mex Uptown Dallas TX', mapNote: '...', website: "https://www.google.com/maps/place/Las+Palmas+Tex-Mex/@32.7975219,-96.8052276,17z/data=!3m1!4b1!4m6!3m5!1s0x864e99b137c655a5:0xcfb3538f7a05612b!8m2!3d32.7975219!4d-96.8026527!16s%2Fg%2F11fj3rxysx?entry=ttu&g_ep=EgoyMDI2MDkwMi4wIKXMDSoASAFQAw%3D%3D " },
  'att-discovery': { price: '$0–15 planned', priceKind: 'estimate', priceNote: '그냥 여기서 기념사진 몇개 찍고 아이스크림 먹을예정', mapQuery: 'AT&T Discovery District 208 S Akard St Dallas TX', website: 'https://discoverydistrict.att.com/', source: { label: 'Discovery District visitor information', url: 'https://discoverydistrict.att.com/' } },
  coffee: { price: '$5–10 / person', priceKind: 'estimate', priceNote: '커피 안마셔도 됌 근처 스벅 찾아서 마시자', mapQuery: 'coffee Downtown Dallas TX', mapNote: '커피안마셔도 됌' },
  'las-colinas': { price: '$0–10 planned', priceKind: 'estimate', priceNote: '무료주차장 없으면 유료주차장 들를 수도, 유명한 아이스크림 집 있으니까 가자', mapQuery: 'Las Colinas Irving TX', mapNote: 'Choose a meeting pin for the final walk.', website: 'https://lascolinas.org/' },
}

export function detailsForStop(id: string): StopDetails {
  return stopDetails[id] ?? { price: 'Budget to confirm', priceKind: 'personal', priceNote: 'Ask the group about the expected cost.' }
}

export function mapForStop(id: string, fallback: string | null): string | null {
  const details = stopDetails[id]
  if (details) return details.mapQuery ? mapsSearchUrl(details.mapQuery) : null
  return fallback && /^https?:\/\//i.test(fallback) ? fallback : null
}
