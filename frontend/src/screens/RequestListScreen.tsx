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
import "./RequestListScreen.css";

type RequestTab = "sent" | "received";

const statusLabels: Record<TradeRequestStatus, string> = {
    pending: "申請中",
    approved: "承認済み",
    rejected: "却下",
    completed: "交換成立",
};

function RequestListScreen() {
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
                    ? request.requesterId === "current_user"
                    : request.receiverId === "current_user"
            ),
        [activeTab, requests]
    );

    const findItem = (itemId: string) => items.find((item) => item.id === itemId);

    const handleUpdateStatus = async (requestId: string, status: TradeRequestStatus) => {
        const updatedRequest = await updateTradeRequestStatus(requestId, status);
        if (!updatedRequest) return;

        setRequests((currentRequests) =>
            currentRequests.map((request) =>
                request.id === requestId ? updatedRequest : request
            )
        );
    };

    return (
        <section className="request-list-screen">
            <header className="request-list-screen__header">
                <div>
                    <p className="request-list-screen__eyebrow">Swap requests</p>
                    <h1>交換申請</h1>
                    <p className="request-list-screen__summary">
                        送った申請と受け取った申請をまとめて確認できます。
                    </p>
                </div>
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

                        return (
                            <article className="request-list-screen__card" key={request.id}>
                                <img
                                    className="request-list-screen__image"
                                    src={mainItem?.imageUrl ?? "/images/demo/generated/reading-card-500.png"}
                                    alt=""
                                />
                                <div>
                                    <span className={statusClassName}>
                                        {statusLabels[request.status]}
                                    </span>
                                    <h2>
                                        {request.offeredItemTitle} と {request.targetItemTitle}
                                    </h2>
                                    <p className="request-list-screen__meta">
                                        {activeTab === "sent"
                                            ? `相手: @${request.receiverName}`
                                            : `申請者: @${request.requesterName}`}
                                        {" / "}
                                        {new Date(request.createdAt).toLocaleDateString("ja-JP")}
                                    </p>
                                    <p className="request-list-screen__message">{request.message}</p>
                                </div>
                                <div className="request-list-screen__actions">
                                    {activeTab === "received" && request.status === "pending" ? (
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
                                    ) : (
                                        <button
                                            className="request-list-screen__button request-list-screen__button--primary"
                                            onClick={() => handleUpdateStatus(request.id, "completed")}
                                            type="button"
                                            disabled={request.status === "completed"}
                                        >
                                            {request.status === "completed" ? "成立済み" : "交換成立にする"}
                                        </button>
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
