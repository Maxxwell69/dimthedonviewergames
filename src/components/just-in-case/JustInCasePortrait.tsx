"use client";

import { JustInCaseGame, type JustInCaseMode } from "./JustInCaseGame";
import "./just-in-case-9x16.css";

type Props = {
  mode?: JustInCaseMode;
  publicToken?: string;
};

export function JustInCasePortrait({ mode = "open", publicToken }: Props) {
  return <JustInCaseGame variant="portrait" mode={mode} publicToken={publicToken} />;
}
