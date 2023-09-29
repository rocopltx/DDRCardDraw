import { nanoid } from "nanoid";
import { GameData, Song, Chart } from "./models/SongData";
import { times } from "./utils";
import { DrawnChart, EligibleChart, Drawing } from "./models/Drawing";
import { ConfigState } from "./config-state";
import { getDifficultyColor } from "./hooks/useDifficultyColor";
import { getDiffAbbr } from "./game-data-utils";
import { getMTGColorColor } from "./hooks/useMTGColorColor";
import { getMTGColorAbbr } from "./game-data-utils";

export function getDrawnChart(
  gameData: GameData,
  currentSong: Song,
  chart: Chart,
): EligibleChart {
  return {
    name: currentSong.name,
    jacket: chart.jacket || currentSong.jacket,
    nameTranslation: currentSong.name_translation,
    artist: currentSong.artist,
    artistTranslation: currentSong.artist_translation,
    bpm: currentSong.bpm,
    level: chart.lvl,
    drawGroup: chart.drawGroup,
    flags: (chart.flags || []).concat(currentSong.flags || []),
    song: currentSong,
    // Fill in variant data per game
    diffAbbr: getDiffAbbr(gameData, chart.diffClass),
    diffColor: getDifficultyColor(gameData, chart.diffClass),
    // Eclipse 2023 DDR A20+
    mtgColorAbbr: getMTGColorAbbr(gameData, chart.mtgColor ?? "UNC"),
    mtgColorColor: getMTGColorColor(gameData, chart.mtgColor ?? "uncolored"),
  };
}

/** returns true if song matches configured flags */
export function songIsValid(
  config: ConfigState,
  song: Song,
  forPocketPick = false,
): boolean {
  if (forPocketPick && !config.constrainPocketPicks) {
    return true;
  }
  return !song.flags || song.flags.every((f) => config.flags.has(f));
}

/** returns true if chart matches configured difficulty/style/lvl/flags */
export function chartIsValid(
  config: ConfigState,
  chart: Chart,
  forPocketPick = false,
): boolean {
  if (forPocketPick && !config.constrainPocketPicks) {
    return chart.style === config.style;
  }
  const levelMetric = chart.drawGroup || chart.lvl;
  return (
    chart.style === config.style &&
    config.difficulties.has(chart.diffClass) &&
    config.mtgColor.has(chart.mtgColor ?? "uncolored") &&
    levelMetric >= config.lowerBound &&
    levelMetric <= config.upperBound &&
    (!chart.flags || chart.flags.every((f) => config.flags.has(f)))
  );
}

export function* eligibleCharts(config: ConfigState, gameData: GameData) {
  for (const currentSong of gameData.songs) {
    if (!songIsValid(config, currentSong)) {
      continue;
    }
    const charts = currentSong.charts.filter((c) => c.style === config.style);

    for (const chart of charts) {
      if (!chartIsValid(config, chart)) {
        continue;
      }

      // add chart to deck
      yield getDrawnChart(gameData, currentSong, chart);
    }
  }
}

/**
 * Produces a drawn set of charts given the song data and the user
 * input of the html form elements.
 * @param songs The song data (see `src/songs/`)
 * @param configData the data gathered by all form elements on the page, indexed by `name` attribute
 */
export function draw(gameData: GameData, configData: ConfigState): Drawing {
  const {
    chartCount: numChartsToRandom,
    upperBound,
    lowerBound,
    useWeights,
    forceDistribution,
    weights,
    groupSongsAt,
  } = configData;

  /** all charts we will consider to be valid for this draw */
  const validCharts = new Map<number, Array<EligibleChart>>();
  times(gameData.meta.lvlMax, (n) => {
    validCharts.set(n, []);
  });

  for (const chart of eligibleCharts(configData, gameData)) {
    let levelMetric = chart.drawGroup || chart.level;
    // merge in higher difficulty charts into a single group, if configured to do so
    if (useWeights && groupSongsAt && groupSongsAt < levelMetric) {
      levelMetric = groupSongsAt;
    }
    validCharts.get(levelMetric)?.push(chart);
  }

  /**
   * the "deck" of difficulty levels to pick from
   */
  let distribution: Array<number> = [];
  /**
   * Total amount of weight used, so we can determine expected outcome below
   */
  let totalWeights = 0;
  /**
   * Maximum number of charts we can expect to draw of each level. Only used with `forceDistribution`
   */
  const maxDrawPerLevel: Record<string, number> = {};
  /**
   * List of difficulty levels that must be picked first, to meet minimums. Only used with `forceDistribution`
   */
  const requiredDrawDifficulties: number[] = [];

  // build an array of possible levels to pick from
  for (let level = lowerBound; level <= upperBound; level++) {
    let weightAmount = 0;
    if (useWeights) {
      weightAmount = weights[level];
      totalWeights += weightAmount;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      weightAmount = validCharts.get(level)!.length;
    }
    times(weightAmount, () => distribution.push(level));
  }

  // If custom weights are used, expectedDrawsPerLevel[level] will be the maximum number
  // of cards of that level allowed in the card draw.
  // e.g. For a 5-card draw, we increase the cap by 1 at every 100%/5 = 20% threshold,
  // so a level with a weight of 15% can only show up on at most 1 card, a level with
  // a weight of 30% can only show up on at most 2 cards, etc.
  if (useWeights && forceDistribution) {
    for (let level = lowerBound; level <= upperBound; level++) {
      const levelAsStr = level.toString();
      const normalizedWeight = weights[level] / totalWeights;
      maxDrawPerLevel[levelAsStr] = Math.ceil(
        normalizedWeight * numChartsToRandom,
      );
      // setup minimum draws
      for (let i = 1; i < maxDrawPerLevel[levelAsStr]; i++) {
        requiredDrawDifficulties.push(level);
      }
    }
  }

  const drawnCharts: DrawnChart[] = [];
  /**
   * Record of how many songs of each difficulty have been drawn so far
   */
  const difficultyCounts: Record<string, number> = {};

  while (drawnCharts.length < numChartsToRandom) {
    if (distribution.length === 0) {
      // no more songs available to pick in the requested range
      // will be returning fewer than requested number of charts
      break;
    }

    // first pick a difficulty (with priority to minimum draws)
    let chosenDifficulty = requiredDrawDifficulties.shift();
    if (!chosenDifficulty) {
      chosenDifficulty =
        distribution[Math.floor(Math.random() * distribution.length)];
    }
    if (useWeights && groupSongsAt && groupSongsAt < chosenDifficulty) {
      chosenDifficulty = groupSongsAt;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const selectableCharts = validCharts.get(chosenDifficulty)!;
    const randomIndex = Math.floor(Math.random() * selectableCharts.length);
    const randomChart = selectableCharts[randomIndex];

    if (randomChart) {
      // Save it in our list of drawn charts
      drawnCharts.push({
        ...randomChart,
        // Give this random chart a unique id within this drawing
        id: `drawn_chart:${nanoid(5)}`,
      });
      // remove drawn chart from deck so it cannot be re-drawn
      selectableCharts.splice(randomIndex, 1);
      if (!difficultyCounts[chosenDifficulty]) {
        difficultyCounts[chosenDifficulty] = 1;
      } else {
        difficultyCounts[chosenDifficulty]++;
      }
    }

    // check if maximum number of expected occurrences of this level of chart has been reached
    const reachedExpected =
      forceDistribution &&
      difficultyCounts[chosenDifficulty.toString()] ===
        maxDrawPerLevel[chosenDifficulty.toString()];

    if (selectableCharts.length === 0 || reachedExpected) {
      // can't pick any more songs of this difficulty
      distribution = distribution.filter((n) => n !== chosenDifficulty);
    }
  }

  return {
    id: `drawing:${nanoid(10)}`,
    charts: shuffle(drawnCharts),
    bans: [],
    protects: [],
    pocketPicks: [],
    winners: [],
  };
}

/**
 * is this an accurate F-Y shuffle? who knows!?!
 */
export function shuffle<Item>(arr: Array<Item>): Array<Item> {
  const ret = arr.slice();
  for (let i = 0; i < ret.length; i++) {
    const randomUpcomingIndex =
      i + Math.floor(Math.random() * (ret.length - i));
    const currentItem = ret[i];
    ret[i] = ret[randomUpcomingIndex];
    ret[randomUpcomingIndex] = currentItem;
  }
  return ret;
}
