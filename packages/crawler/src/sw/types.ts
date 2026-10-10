export type SwLevel = 1 | 2 | 3;

export interface SwIndustry {
  level: SwLevel;
  industryCode: string;
  name: string;
  weight: number;
}

export interface SwIndustryRecord extends SwIndustry {
  indexCode: string;
}

export interface SwMapData {
  indexCode: string;
  industries: SwIndustryRecord[];
}
