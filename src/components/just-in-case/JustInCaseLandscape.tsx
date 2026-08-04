"use client";

import {
  JustInCaseGame,
  type JustInCaseMode,
  type JustInCaseTheme,
} from "./JustInCaseGame";
import "./just-in-case-16x9.css";

type Props = {
  mode?: JustInCaseMode;
  theme?: JustInCaseTheme;
  publicToken?: string;
};

export function JustInCaseLandscape({
  mode = "open",
  theme = "dom",
  publicToken,
}: Props) {
  return (
    <JustInCaseGame
      variant="landscape"
      theme={theme}
      mode={mode}
      publicToken={publicToken}
    />
  );
}
