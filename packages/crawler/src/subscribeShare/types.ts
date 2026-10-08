export type SubscribeShareRow = [
  string | number,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
];

export interface SubscribeShareSnapshotData {
  code: string;
  latestDate: number;
  rows: SubscribeShareRow[];
}
