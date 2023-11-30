import { GameData } from "../models/SongData";

/**
 * Returns the CSS color specified in the game file metadata for a given difficulty
 */
export function getMTGColorColor(gameData: GameData, mtgColor: string): string {
  return gameData.meta.mtgColor?.find((d) => d.key === mtgColor)?.color || "";
}
