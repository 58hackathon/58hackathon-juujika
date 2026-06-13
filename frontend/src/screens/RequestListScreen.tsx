import { useEffect, useMemo, useState } from "react";
import { getItems } from "../features/items/itemApi";
import type { Item } from "../features/items/itemTypes";
import {
    getTradeRequests,
    updateTradeRequestStatus,
} from "../features/tradeRequests/tradeRequestApi";
import type {
    TradeRequest,
    TradeRequestStatus,
} from "../features/tradeRequests/tradeRequestTypes";
import { isCurrentUserResource } from "../features/users/currentUser";
import type { RegisteredUser } from "../features/users/userTypes";
import "./RequestListScreen.css";

type RequestTab = "sent" | "received";

type RequestListScreenProps = {
    currentUser: RegisteredUser;
    onOpenTrade: (request: TradeRequest) => void;
};

const statusLabels: Record<TradeRequestStatus, string> = {
    pending: "申請中",
    approved: "承認済み",
    rejected: "却下",
    completed: "交換成立",
};

function RequestListScreen({ currentUser, onOpenTrade }: RequestListScreenProps) {
    const [activeTab, setActiveTab] = useState<RequestTab>("sent");
    const [requests, setRequests] = useState<TradeRequest[]>([]);
    const [items, setItems] = useState<Item[]>([]);

    useEffect(() => {
        const loadRequests = async () => {
            const [requestsFromApi, itemsFromApi] = await Promise.all([
                getTradeRequests(),
                getItems(),
            ]);

            setRequests(requestsFromApi);
            setItems(itemsFromApi);
        };

        loadRequests();
    }, []);

    const visibleRequests = useMemo(
        () =>
            requests.filter((request) =>
                activeTab === "sent"
                    ? isCurrentUserResource(request.requesterId, currentUser.id)
                    : isCurrentUserResource(request.receiverId, currentUser.id)
            ),
        [activeTab, currentUser.id, requests]
    );

    const findItem = (itemId: string) => items.find((item) => item.id === itemId);
    const receivedCount = requests.filter(
        (request) => isCurrentUserResource(request.receiverId, currentUser.id)
    ).length;

    const handleUpdateStatus = async (
        requestId: string,
        status: TradeRequestStatus,
        options?: { openDetail?: boolean }
    ) => {
        const updatedRequest = await updateTradeRequestStatus(requestId, status);
        if (!updatedRequest) return;

        setRequests((currentRequests) =>
            currentRequests.map((request) =>
                request.id === requestId ? updatedRequest : request
            )
        );

        if (options?.openDetail) {
            onOpenTrade(updatedRequest);
        }
    };

    return (
        <section className="request-list-screen">
            <header className="request-list-screen__header">
                <h1>申請中</h1>
                <div className="request-list-screen__tabs" aria-label="申請の種類">
                    <button
                        className={
                            activeTab === "sent"
                                ? "request-list-screen__tab request-list-screen__tab--active"
                                : "request-list-screen__tab"
                        }
                        onClick={() => setActiveTab("sent")}
                        type="button"
                    >
                        申請したもの
                    </button>
                    <button
                        className={
                            activeTab === "received"
                                ? "request-list-screen__tab request-list-screen__tab--active"
                                : "request-list-screen__tab"
                        }
                        onClick={() => setActiveTab("received")}
                        type="button"
                    >
                        受け取ったもの
                        {receivedCount > 0 && (
                            <span className="request-list-screen__tab-badge">
                                {receivedCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {visibleRequests.length > 0 ? (
                <div className="request-list-screen__list">
                    {visibleRequests.map((request) => {
                        const mainItem =
                            activeTab === "sent"
                                ? findItem(request.targetItemId)
                                : findItem(request.offeredItemId);
                        const statusClassName =
                            request.status === "pending"
                                ? "request-list-screen__status"
                                : `request-list-screen__status request-list-screen__status--${request.status}`;
                        const canReviewRequest =
                            activeTab === "received" && request.status === "pending";
                        const canCompleteRequest =
                            activeTab === "received" && request.status === "approved";
                        const canOpenTrade = request.status === "completed";
                        const partnerName =
                            activeTab === "sent"
                                ? request.receiverName
                                : request.requesterName;
                        const displayTitle = mainItem?.title ?? (
                            activeTab === "sent"
                                ? request.targetItemTitle
                                : request.offeredItemTitle
                        );

                        return (
                            <article className="request-list-screen__card" key={request.id}>
                                <img
                                    className="request-list-screen__image"
                                    src={mainItem?.imageUrl ?? "/images/demo/generated/reading-card-500.png"}
                                    alt=""
                                />
                                <div className="request-list-screen__content">
                                    <div className="request-list-screen__content-top">
                                        <div>
                                            <h2>{displayTitle}</h2>
                                            <p className="request-list-screen__user">@{partnerName}</p>
                                        </div>
                                        <span className={statusClassName}>
                                            {statusLabels[request.status]}
                                        </span>
                                    </div>
                                    <p className="request-list-screen__meta">
                                        申請日：{new Date(request.createdAt).toLocaleDateString("ja-JP", {
                                            month: "numeric",
                                            day: "numeric",
                                        })}
                                    </p>
                                    <div className="request-list-screen__divider" />
                                    <p className="request-list-screen__message">
                                        {canOpenTrade ? "取引画面へ進めます" : "返答を待っています..."}
                                    </p>
                                </div>
                                <div className="request-list-screen__actions" aria-label="申請操作">
                                    {canReviewRequest ? (
                                        <>
                                            <button
                                                className="request-list-screen__button request-list-screen__button--primary"
                                                onClick={() => handleUpdateStatus(request.id, "approved")}
                                                type="button"
                                            >
                                                承認
                                            </button>
                                            <button
                                                className="request-list-screen__button"
                                                onClick={() => handleUpdateStatus(request.id, "rejected")}
                                                type="button"
                                            >
                                                却下
                                            </button>
                                        </>
                                    ) : canCompleteRequest ? (
                                        <button
                                            className="request-list-screen__button request-list-screen__button--primary"
                                            onClick={() =>
                                                handleUpdateStatus(request.id, "completed", {
                                                    openDetail: true,
                                                })
                                            }
                                            type="button"
                                        >
                                            交換成立にする
                                        </button>
                                    ) : canOpenTrade ? (
                                        <button
                                            className="request-list-screen__button request-list-screen__button--primary"
                                            onClick={() => onOpenTrade(request)}
                                            type="button"
                                        >
                                            取引画面へ
                                        </button>
                                    ) : (
                                        <span className="request-list-screen__readonly">
                                            {activeTab === "sent"
                                                ? "相手の操作を待っています"
                                                : statusLabels[request.status]}
                                        </span>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="request-list-screen__empty">
                    <h2>まだ申請はありません</h2>
                    <p>気になる商品から交換申請を送ってみましょう。</p>
                </div>
            )}
        </section>
    );
}

export default RequestListScreen;
