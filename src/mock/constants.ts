import type { Trade } from './types'

export const DEMO_NOW = '2026-07-21T07:46:00-04:00'
export const RNG_SEED = 20260721

export const FIRST_NAMES = [
  'John', 'Jane', 'Bob', 'Alice', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Laura',
  'James', 'Maria', 'Robert', 'Linda', 'Michael', 'Patricia', 'William', 'Barbara',
  'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Karen', 'Charles', 'Nancy',
  'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
  'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Donna', 'Andrew', 'Carol',
]

export const LAST_NAMES = [
  'Doe', 'Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson',
  'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez',
  'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young',
  'Hernandez', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Baker',
  'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips',
]

export const TRADES: Trade[] = ['Sprinkler', 'Fire Alarm', 'Inspector']

export const SITE_NAMES = [
  'Metro Office Tower', 'Harbor Logistics Center', 'Parkside Medical Plaza', 'Westview High School',
  'East River Retail Park', 'Central Library', 'Northside Industrial Complex', 'Southport Hotel',
  'Downtown Convention Center', 'Liberty Warehouse District', 'Greenwood Office Park',
  'Bayfront Apartments', 'Uptown Shopping Center', 'Riverside Corporate Campus', 'Sunset Medical Center',
  'Midtown Business Hub', 'Ferry Terminal Building', 'Airport Cargo Facility', 'Peninsula Power Plant',
  'Queensbridge Community Center', 'Bronxville Factory', 'Hempstead Municipal Building',
  'Great Neck Office Plaza', 'Massapequa Medical Arts', 'Valley Stream Distribution Center',
  'Garden City Retail Commons', 'Mineola Courthouse', 'Rockville Centre School', 'Long Beach Boardwalk Pavilion',
  'Port Washington Marina', 'New Hyde Park Clinic', 'Oceanside Fire Station', 'Lynbrook Warehouse',
  'Freeport Community Center', 'Baldwin Office Building', 'Roslyn Heights Condo', 'Glen Cove Civic Center',
  'Manhasset Hospital Wing', 'Wantagh Industrial Park', 'East Meadow Public Safety',
]

export const CLIENT_NAMES = [
  'Acme Property Group', 'BrightStar Portfolio Services', 'Civic Facilities Management',
  'Downtown Development LLC', 'Empire Maintenance Partners', 'First Class Property Care',
  'Golden Gate Management', 'Horizon Building Services', 'Independence Realty Trust',
  'Jefferson Commercial Group', 'Kinetic Facilities', 'Liberty Holdings', 'Meridian Properties',
  'North Atlantic Realty', 'Olympus Management Group', 'Pinnacle Facility Services',
  'Quality Building Partners', 'Reliable Property Solutions', 'Summit Management LLC',
  'Titan Realty Advisors', 'Union Square Properties', 'Vanguard Building Services',
  'Waterfront Development Corp', 'Zenith Property Management',
]

export function createRng(seed: number) {
  let s = seed
  return function next() {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export const rng = createRng(RNG_SEED)
