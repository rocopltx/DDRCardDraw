import { DataConnection } from "peerjs";
import { Song } from "./SongData";

export interface EligibleChart {
  name: string;
  jacket: string;
  nameTranslation?: string;
  artist: string;
  artistTranslation?: string;
  bpm: string;
  diffAbbr: string;
  diffColor: string;
  mtgColorAbbr?: string;
  mtgColorColor?: string;
  level: number;
  drawGroup?: number;
  flags: string[];
  song: Song;
}

export interface DrawnChart extends EligibleChart {
  id: string;
}

export interface PlayerActionOnChart {
  player: 1 | 2;
  chartId: string;
}

export interface PocketPick extends PlayerActionOnChart {
  pick: EligibleChart;
}

export interface Drawing {
  id: string;
  title?: string;
  player1?: string;
  player2?: string;
  charts: DrawnChart[];
  bans: Array<PlayerActionOnChart>;
  protects: Array<PlayerActionOnChart>;
  winners: Array<PlayerActionOnChart>;
  pocketPicks: Array<PocketPick>;
  /** __ prefix avoids serializing this field during sync */
  __syncPeer?: DataConnection;
}
