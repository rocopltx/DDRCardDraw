import { shallow } from "zustand/shallow";
import styles from "./controls-weights.css";
import { times, zeroPad } from "../utils";
import { useMemo } from "react";
import { useConfigState } from "../config-state";
import { useIntl } from "../hooks/useIntl";
import { NumericInput, Checkbox, Classes } from "@blueprintjs/core";

interface Props {
  usesTiers: boolean;
  high: number;
  low: number;
}

interface ColorProps {
  mtgColor: ReadonlySet<string>;
}
const pctFmt = new Intl.NumberFormat(undefined, { style: "percent" });

export function WeightsControls({ usesTiers, high, low }: Props) {
  const { t } = useIntl();
  const {
    weights,
    forceDistribution,
    groupSongsAt,
    updateConfig,
    totalToDraw,
  } = useConfigState(
    (cfg) => ({
      weights: cfg.weights,
      forceDistribution: cfg.forceDistribution,
      groupSongsAt: cfg.groupSongsAt,
      updateConfig: cfg.update,
      totalToDraw: cfg.chartCount,
    }),
    shallow,
  );
  let groups = useMemo(
    () => times(high - low + 1, (n) => n + low - 1),
    [high, low],
  );

  function toggleForceDistribution() {
    updateConfig((state) => ({
      forceDistribution: !state.forceDistribution,
    }));
  }

  function toggleGroupCheck() {
    updateConfig((state) => {
      if (state.groupSongsAt) {
        return { groupSongsAt: null };
      }

      return { groupSongsAt: state.upperBound - 1 };
    });
  }

  function handleGroupCutoffChange(next: number) {
    if (isNaN(next)) {
      return;
    }
    if (next < low) {
      return;
    }
    updateConfig({ groupSongsAt: next });
  }

  function setWeight(groupIndex: number, value: number) {
    updateConfig((state) => {
      const newWeights = state.weights.slice();
      if (Number.isInteger(value)) {
        newWeights[groupIndex] = value;
      } else {
        delete newWeights[groupIndex];
      }
      return { weights: newWeights };
    });
  }

  if (groupSongsAt) {
    groups = groups.filter((l) => l <= groupSongsAt);
  }
  const totalWeight = groups.reduce(
    (total, group) => total + (weights[group] || 0),
    0,
  );
  const percentages = groups.map((group) => {
    const value = weights[group] || 0;
    const pct = value / totalWeight;
    if (forceDistribution) {
      if (pct === 1) {
        return totalToDraw;
      }
      const max = Math.ceil(totalToDraw * pct);
      if (!max) {
        return 0;
      }
      return `${max - 1}-${max}`;
    } else {
      return pctFmt.format(isNaN(pct) ? 0 : pct);
    }
  });

  return (
    <section className={styles.weights}>
      <p className={Classes.TEXT_MUTED}>
        {forceDistribution
          ? t("weights.forcedExplanation")
          : t("weights.explanation")}
      </p>
      {groups.map((group, i) => (
        <div className={styles.level} key={group}>
          <NumericInput
            width={2}
            name={`weight-${group}`}
            value={weights[group] || ""}
            min={0}
            onValueChange={(v) => setWeight(group, v)}
            placeholder="0"
            fill
          />
          {groupSongsAt === group && ">="}
          {usesTiers ? `T${zeroPad(group, 2)}` : group}{" "}
          <sub>{percentages[i]}</sub>
        </div>
      ))}
      <Checkbox
        label={t("weights.check.label")}
        title={t("weights.check.title")}
        checked={forceDistribution}
        onChange={toggleForceDistribution}
      />
      <Checkbox
        label={t("weights.group.label")}
        title={t("weights.group.title")}
        checked={groupSongsAt !== null}
        onChange={toggleGroupCheck}
      />
      <NumericInput
        width={2}
        disabled={!groupSongsAt}
        value={groupSongsAt || high - 1}
        min={low}
        onValueChange={handleGroupCutoffChange}
        placeholder="0"
      />
    </section>
  );
}

// Eclipse 2023 DDR A20+
export function ColorWeightsControls({mtgColor}: ColorProps) {
  const { t } = useIntl();
  const {
    weights,
    forceDistribution,
    updateConfig,
    totalToDraw,
  } = useConfigState(
    (cfg) => ({
      weights: cfg.weights,
      forceDistribution: cfg.forceDistribution,
      updateConfig: cfg.update,
      totalToDraw: cfg.chartCount,
    }),
    shallow,
  );
  // Map the different possible colors to a number.
  type mtgColorRecord = Record<string, number>;
  // I don't know how to parameterize this yet.
  const ee23Record: mtgColorRecord = {
    "uncolored": 0,
    "white": 1,
    "blue": 2,
    "black": 3,
    "red": 4,
    "green": 5
  }
  
  // get the highest-valued color in selectedMTGColor
  interface Value {
    key?: string,
    value: number;
  }
  // Assign numbers to each value in selectedMTGColor
  let mtgColorMapSelected = new Map<string, number>();
  mtgColor.forEach(function(key) {
    mtgColorMapSelected.set(key, ee23Record[key])
  })
  
  // const greatest = mtgColorMapSelected.forEach(accumulator: Value, element: Value) => {
  //     if (accumulator["value"] > element["value"])
  //         return accumulator;
  //     return element;
  // });

  var high = 0 //default 'uncolored'
  for (let value of mtgColorMapSelected.values()) {
    if (value > high){
      high = value
    }
  }
  // get the lowest-valued color in selectedMTGColor
  var low = 5 //default 'green'
  for (let value of mtgColorMapSelected.values()) {
    if (value < low){
      low = value
    }
  }
  
  let groups = useMemo(
    () => times(high - low + 1, (n) => n + low - 1),
    [high, low],
  );

  function toggleForceDistribution() {
    updateConfig((state) => ({
      forceDistribution: !state.forceDistribution,
    }));
  }

  function setWeight(groupIndex: number, value: number) {
    updateConfig((state) => {
      const newWeights = state.weights.slice();
      if (Number.isInteger(value)) {
        newWeights[groupIndex] = value;
      } else {
        delete newWeights[groupIndex];
      }
      return { weights: newWeights };
    });
  }
  const totalWeight = groups.reduce(
    (total, group) => total + (weights[group] || 0),
    0,
  );
  const percentages = groups.map((group) => {
    const value = weights[group] || 0;
    const pct = value / totalWeight;
    if (forceDistribution) {
      if (pct === 1) {
        return totalToDraw;
      }
      const max = Math.ceil(totalToDraw * pct);
      if (!max) {
        return 0;
      }
      return `${max - 1}-${max}`;
    } else {
      return pctFmt.format(isNaN(pct) ? 0 : pct);
    }
  });

  return (
    <section className={styles.weights}>
      <p className={Classes.TEXT_MUTED}>
        {forceDistribution
          ? t("weights.forcedExplanationColor")
          : t("weights.explanationColor")}
      </p>
      {groups.map((group, i) => (
        <div className={styles.level} key={group}>
          <NumericInput
            width={2}
            name={`weight-${group}`}
            value={weights[group] || ""}
            min={0}
            onValueChange={(v) => setWeight(group, v)}
            placeholder="0"
            fill
          />
          <sub>{percentages[i]}</sub>
        </div>
      ))}
      <Checkbox
        label={t("weights.check.label")}
        title={t("weights.check.title")}
        checked={forceDistribution}
        onChange={toggleForceDistribution}
      />
    </section>
  );
}