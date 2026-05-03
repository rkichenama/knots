export type Run = {
  codingPattern: string;
  count: number;
}

export type KnotProps = {
  parts?: number;
  bights?: number;
  sobre?: boolean;
  pattern?: string;
}

export type StrandProps = KnotProps & { color?: string };

export type InterweavedKnotProps = {
  parts: number;
  bights: number;
  strands: StrandProps[];
};