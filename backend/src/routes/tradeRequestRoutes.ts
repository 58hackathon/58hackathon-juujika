import type { Request, Response } from "express";
import { Router } from "express";

import {
  getTradeRequest,
  listTradeRequests,
  patchTradeRequestStatus,
  postTradeRequest,
} from "../controllers/tradeRequestController.js";

export const tradeRequestRoutes = Router();

type AiTradeRouteStep = {
  from: string;
  to: string;
  reason: string;
};

type AiTradeRouteCandidate = {
  id: string;
  title: string;
  confidence: number;
  stepCount: number;
  summary: string;
  highlight: string;
  steps: AiTradeRouteStep[];
};

const aiTradeRouteCandidates: AiTradeRouteCandidate[] = [
  {
    id: "ai_route_balanced",
    title: "イヤホン到達ルート",
    confidence: 78,
    stepCount: 3,
    summary: "成立見込みが高く、価値のバランスが良いルートです。",
    highlight: "一番バランスが良い",
    steps: [
      {
        from: "レザースニーカー",
        to: "トートバッグ",
        reason: "ファッション同士で交換理由を作りやすい",
      },
      {
        from: "トートバッグ",
        to: "小型スピーカー",
        reason: "日用品からガジェットへ価値を上げやすい",
      },
      {
        from: "小型スピーカー",
        to: "イヤホン",
        reason: "同じ音楽カテゴリで申請しやすい",
      },
    ],
  },
  {
    id: "ai_route_fast",
    title: "バッグ到達ルート",
    confidence: 65,
    stepCount: 2,
    summary: "短い手順で早く成立させやすいルートです。",
    highlight: "すぐ成立しやすい",
    steps: [
      {
        from: "レザースニーカー",
        to: "キャップ",
        reason: "価格帯が近く、気軽に提案できる",
      },
      {
        from: "キャップ",
        to: "バッグ",
        reason: "ファッション小物同士で需要が近い",
      },
    ],
  },
  {
    id: "ai_route_high_value",
    title: "スマートウォッチ到達ルート",
    confidence: 42,
    stepCount: 4,
    summary: "難易度は高いですが、最終的な価値が上がるルートです。",
    highlight: "価値は高いが難しい",
    steps: [
      {
        from: "レザースニーカー",
        to: "トートバッグ",
        reason: "まず交換成立しやすい商品へ移る",
      },
      {
        from: "トートバッグ",
        to: "小型スピーカー",
        reason: "ガジェットカテゴリへ近づける",
      },
      {
        from: "小型スピーカー",
        to: "イヤホン",
        reason: "音楽カテゴリ内で価値を上げる",
      },
      {
        from: "イヤホン",
        to: "スマートウォッチ",
        reason: "デジタル機器同士で交換提案しやすい",
      },
    ],
  },
];

tradeRequestRoutes.get("/ai-routes", listAiTradeRoutes);
tradeRequestRoutes.get("/ai-routes/:routeId", getAiTradeRoute);
tradeRequestRoutes.post("/ai-routes/:routeId/approve", approveAiTradeRoute);
tradeRequestRoutes.get("/", listTradeRequests);
tradeRequestRoutes.post("/", postTradeRequest);
tradeRequestRoutes.get("/:id", getTradeRequest);
tradeRequestRoutes.patch("/:id/status", patchTradeRequestStatus);

function listAiTradeRoutes(req: Request, res: Response): void {
  const offeredItemTitle =
    getQueryParam(req.query.offeredItemTitle) ?? "レザースニーカー";
  const targetItemTitle = getQueryParam(req.query.targetItemTitle) ?? "イヤホン";

  res.json({
    data: aiTradeRouteCandidates.map((candidate) =>
      toAiTradeRouteResponse(candidate, offeredItemTitle, targetItemTitle)
    ),
    meta: {
      mode: "mock",
      message:
        "AI提案の仮データです。フロント接続後に本物の推薦ロジックへ差し替えできます。",
    },
  });
}

function getAiTradeRoute(req: Request, res: Response): void {
  const candidate = findAiTradeRoute(getRouteParam(req.params.routeId));
  if (!candidate) {
    res.status(404).json({ error: "AI trade route not found" });
    return;
  }

  res.json({
    data: toAiTradeRouteResponse(candidate),
  });
}

function approveAiTradeRoute(req: Request, res: Response): void {
  const candidate = findAiTradeRoute(getRouteParam(req.params.routeId));
  if (!candidate) {
    res.status(404).json({ error: "AI trade route not found" });
    return;
  }

  const response = toAiTradeRouteResponse(candidate);
  res.json({
    data: {
      approvedRoute: response,
      nextAction: "POST /trade-requests",
      tradeRequestDraft: {
        targetItemId: "ai_target_item",
        targetItemTitle: response.title,
        offeredItemId: "current_user_item",
        offeredItemTitle: response.steps[0]?.from ?? "出品した商品",
        requesterId: "current_user",
        requesterName: "you",
        receiverId: "ai_recommended_owner",
        receiverName: "recommended_owner",
        message: `AI提案「${response.title}」で交換申請したいです。`,
      },
    },
  });
}

function findAiTradeRoute(
  routeId: string | undefined
): AiTradeRouteCandidate | undefined {
  return aiTradeRouteCandidates.find((candidate) => candidate.id === routeId);
}

function toAiTradeRouteResponse(
  candidate: AiTradeRouteCandidate,
  offeredItemTitle = "レザースニーカー",
  targetItemTitle = "イヤホン"
): AiTradeRouteCandidate {
  const firstStep = candidate.steps[0];
  const lastStep = candidate.steps[candidate.steps.length - 1];

  return {
    ...candidate,
    steps: candidate.steps.map((step, index) => ({
      ...step,
      from: index === 0 ? offeredItemTitle : step.from,
      to: index === candidate.steps.length - 1 ? targetItemTitle : step.to,
    })),
    title:
      lastStep === undefined
        ? candidate.title
        : `${targetItemTitle}到達ルート`,
    summary:
      firstStep === undefined
        ? candidate.summary
        : `${offeredItemTitle}から${targetItemTitle}を目指す提案です。${candidate.summary}`,
  };
}

function getQueryParam(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function getRouteParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
