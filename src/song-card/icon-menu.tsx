import { useIntl } from "../hooks/useIntl";
import { IconNames, IconName } from "@blueprintjs/icons";
import { Menu, MenuItem, MenuDivider } from "@blueprintjs/core";
import { usePlayerLabel } from "./use-player-label";

interface Props {
  onStartPocketPick?: (p: 1 | 2) => void;
  onVeto?: (p: 1 | 2) => void;
  onProtect?: (p: 1 | 2) => void;
  onRedraw?: () => void;
  onSetWinner?: (p: 1 | 2 | null) => void;
}

export function IconMenu(props: Props) {
  const { onStartPocketPick, onVeto, onProtect, onRedraw, onSetWinner } = props;

  const { t } = useIntl();

  return (
    <Menu>
      {onProtect && (
        <MenuPair
          icon={IconNames.LOCK}
          text={t("songAction.lock")}
          onClick={onProtect}
        />
      )}
      {onStartPocketPick && (
        <MenuPair
          icon={IconNames.INHERITANCE}
          text={t("songAction.pocketPick")}
          onClick={onStartPocketPick}
        />
      )}
      {onVeto && (
        <MenuPair
          icon={IconNames.BAN_CIRCLE}
          text={t("songAction.ban")}
          onClick={onVeto}
        />
      )}
      {onSetWinner && (
        <MenuPair
          icon={IconNames.CROWN}
          text={t("songAction.winner")}
          onClick={onSetWinner}
        />
      )}
      {onRedraw && (
        <>
          <MenuDivider />
          <MenuItem text="Redraw" icon={IconNames.REFRESH} onClick={onRedraw} />
        </>
      )}
    </Menu>
  );
}

interface IconRowProps {
  icon: IconName;
  text: string;
  onClick: (p: 1 | 2) => void;
}

function MenuPair({ icon, text, onClick }: IconRowProps) {
  return (
    <MenuItem icon={icon} text={text}>
      <MenuItem
        text={usePlayerLabel(1)}
        onClick={() => onClick(1)}
        icon={IconNames.PERSON}
      />
      <MenuItem
        text={usePlayerLabel(2)}
        onClick={() => onClick(2)}
        icon={IconNames.PERSON}
      />
    </MenuItem>
  );
}
