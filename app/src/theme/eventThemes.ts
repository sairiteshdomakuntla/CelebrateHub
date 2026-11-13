export type EventType =
  | 'BIRTHDAY' | 'WEDDING' | 'ENGAGEMENT' | 'BABY_SHOWER'
  | 'ANNIVERSARY' | 'HOUSEWARMING' | 'FESTIVAL' | 'CORPORATE' | 'OTHER';

export type EventTheme = {
  bg: string;
  surface: string;
  surfaceRaised?: string;
  gradient: readonly [string, string];
  accent: string;
};

export const eventThemes: Record<EventType, EventTheme> = {
  BIRTHDAY:     { bg: '#120F2B', surface: '#1E1A3F', surfaceRaised: '#2A2460', gradient: ['#7C5CFF', '#D6307F'], accent: '#FFC53D' },
  WEDDING:      { bg: '#1F0D14', surface: '#2E1520', surfaceRaised: '#3D1C2B', gradient: ['#B3364A', '#E0A93B'], accent: '#E8B96A' },
  ENGAGEMENT:   { bg: '#1E0F1A', surface: '#2D1927', surfaceRaised: '#3E2235', gradient: ['#D4577F', '#E8B08A'], accent: '#F0C9A0' },
  BABY_SHOWER:  { bg: '#0E1F22', surface: '#172E32', surfaceRaised: '#213E44', gradient: ['#3FB6B2', '#F4A6A0'], accent: '#F9D3C2' },
  ANNIVERSARY:  { bg: '#1B0C14', surface: '#2A1520', surfaceRaised: '#3A1E2C', gradient: ['#8E2F4F', '#D08C7B'], accent: '#E3B3A5' },
  HOUSEWARMING: { bg: '#1D140E', surface: '#2B2018', surfaceRaised: '#3B2C22', gradient: ['#C4633F', '#8DA58A'], accent: '#E3C28A' },
  FESTIVAL:     { bg: '#1A0E08', surface: '#2A1810', surfaceRaised: '#3B2317', gradient: ['#E8590C', '#F5B301'], accent: '#FFD36B' },
  CORPORATE:    { bg: '#0B1626', surface: '#14243A', surfaceRaised: '#1E3352', gradient: ['#2E6FD8', '#2BB3A3'], accent: '#6EE0D2' },
  OTHER:        { bg: '#120F2B', surface: '#1E1A3F', surfaceRaised: '#2A2460', gradient: ['#7C5CFF', '#D6307F'], accent: '#FFC53D' },
};
