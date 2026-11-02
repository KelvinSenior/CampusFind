export type UserRole = 'STUDENT' | 'ADMIN';
export type ReportType = 'LOST' | 'FOUND';
export type ItemCategory =
  | 'ELECTRONICS'
  | 'BAGS'
  | 'IDENTIFICATION'
  | 'BOOKS'
  | 'CLOTHING'
  | 'JEWELLERY'
  | 'KEYS'
  | 'DOCUMENTS'
  | 'OTHER';
export type CampusLocation =
  | 'LECTURE_HALL'
  | 'LIBRARY'
  | 'RESIDENCE'
  | 'CAFETERIA'
  | 'LABORATORY'
  | 'SPORTS_FACILITY'
  | 'ADMIN_BLOCK'
  | 'OTHER';
export type ItemStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RECOVERED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ItemReport {
  id: string;
  reference: string;
  reportType: ReportType;
  itemName: string;
  category: ItemCategory;
  description: string;
  photoUrl: string | null;
  dateOccurred: string;
  location: CampusLocation;
  locationDetails: string | null;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: { id: string; name: string };
}

export interface Claim {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
  explanation: string;
  distinguishingFeatures: string;
  additionalEvidence?: string | null;
  handoverCode?: string | null;
  report: { id: string; reference?: string; itemName: string; status?: ItemStatus };
  user?: { id: string; name: string; email?: string };
}

export interface PotentialMatch {
  report: Pick<ItemReport, 'id' | 'reference' | 'itemName' | 'category' | 'description' | 'location' | 'dateOccurred' | 'status'>;
  score: number;
  reasons: string[];
}

export interface AdminStatistics {
  users: number;
  totalReports: number;
  lost: number;
  found: number;
  pendingReports: number;
  pendingClaims: number;
  recovered: number;
  openAbuse: number;
  recentActivities: ActivityRecord[];
}

export interface ActivityRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor?: { id: string; name: string; role: UserRole } | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string | null;
  publishedAt: string;
  isPublished?: boolean;
  createdAt?: string;
}

export interface SavedItem {
  id: string;
  createdAt: string;
  report: ItemReport;
}

export interface AbuseReportRecord {
  id: string;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'RESOLVED' | 'REJECTED';
  createdAt: string;
  resolvedAt: string | null;
  report: { id: string; reference: string; itemName: string };
  reporter: { id: string; name: string; email: string };
}

export interface StudentAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  _count: { reports: number; claims: number };
}

export interface StudentStatistics {
  reports: number;
  lostReports: number;
  foundReports: number;
  pendingClaims: number;
  recoveredItems: number;
  unreadNotifications: number;
  potentialMatches: number;
  recentActivities: ActivityRecord[];
}

export interface DemoConfig {
  enabled: boolean;
  password?: string;
  accounts?: Array<{ name: string; email: string; role: UserRole }>;
}

export interface ReportFilters {
  q: string;
  type: ReportType | '';
  category: ItemCategory | '';
  location: CampusLocation | '';
  status: 'APPROVED' | 'RECOVERED' | '';
  date: string;
  sort: 'newest' | 'oldest' | 'updated';
}

export const categories: Array<{ value: ItemCategory; label: string }> = [
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'BAGS', label: 'Bags & backpacks' },
  { value: 'IDENTIFICATION', label: 'Identification cards' },
  { value: 'BOOKS', label: 'Books & stationery' },
  { value: 'CLOTHING', label: 'Clothing' },
  { value: 'JEWELLERY', label: 'Jewellery & accessories' },
  { value: 'KEYS', label: 'Keys' },
  { value: 'DOCUMENTS', label: 'Documents' },
  { value: 'OTHER', label: 'Other' },
];

export const locations: Array<{ value: CampusLocation; label: string }> = [
  { value: 'LECTURE_HALL', label: 'Lecture halls' },
  { value: 'LIBRARY', label: 'Library' },
  { value: 'RESIDENCE', label: 'Hostel or residence' },
  { value: 'CAFETERIA', label: 'Cafeteria' },
  { value: 'LABORATORY', label: 'Laboratory' },
  { value: 'SPORTS_FACILITY', label: 'Sports facilities' },
  { value: 'ADMIN_BLOCK', label: 'Administrative block' },
  { value: 'OTHER', label: 'Other' },
];

export function labelFor(options: Array<{ value: string; label: string }>, value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
