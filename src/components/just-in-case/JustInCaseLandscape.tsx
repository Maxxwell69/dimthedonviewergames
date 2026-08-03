"use client";

import { JustInCaseGame, type JustInCaseMode } from "./JustInCaseGame";
import "./just-in-case-16x9.css";

type Props = {
  mode?: JustInCaseMode;
  publicToken?: string;
};

export function JustInCaseLandscape({ mode = "open", publicToken }: Props) {
  return <JustInCaseGame variant="landscape" mode={mode} publicToken={publicToken} />;
}
