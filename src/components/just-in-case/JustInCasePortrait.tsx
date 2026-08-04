"use client";

import {
  JustInCaseGame,
  type JustInCaseMode,
  type JustInCaseTheme,
} from "./JustInCaseGame";
import "./just-in-case-9x16.css";
import "./just-in-case-dom-theme.css";

type Props = {
  mode?: JustInCaseMode;
  theme?: JustInCaseTheme;
  publicToken?: string;
};

export function JustInCasePortrait({
  mode = "open",
  theme = "dom",
  publicToken,
}: Props) {
  return (
    <JustInCaseGame
      variant="portrait"
      theme={theme}
      mode={mode}
      publicToken={publicToken}
    />
  );
}
