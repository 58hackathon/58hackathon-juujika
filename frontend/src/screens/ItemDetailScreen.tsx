import { useEffect, useState } from "react";
import type { Item } from "../features/items/itemTypes";
import { getTradeRequests } from "../features/tradeRequests/tradeRequestApi";
import type {
    TradeRequest,
    TradeRequestStatus,
} from "../features/tradeRequests/tradeRequestTypes";
import "./ItemDetailScreen.css";

type ItemDetailScreenProps = {
    item: Item;
    onBack: () => void;
    onRequestTrade: (item: Item) => void;
};

const statusLabels: Record<TradeRequestStatus, string> = {
    pending: "申請中",
    approved: "承認済み",
    rejected: "却下",
    completed: "交換成立",
};

function ItemDetailScreen({ item, onBack, onRequestTrade }: ItemDetailScreenProps) {
    const [receivedRequests, setReceivedRequests] = useState<TradeRequest[]>([]);
    const isOwnItem = item.ownerId === "current_user";

    useEffect(() => {
        if (!isOwnItem) {
            setReceivedRequests([]);
            return;
        }

        const loadReceivedRequests = async () => {
            const requests = await getTradeRequests();
            setReceivedRequests(
                requests.filter(
                    (request) =>
                        request.targetItemId === item.id &&
                        request.receiverId === "current_user"
                )
            );
        };

        loadReceivedRequests();
    }, [isOwnItem, item.id]);

    return (
        <section className="item-detail-screen">
            <button className="item-detail-screen__back" onClick={onBack} type="button">
                戻る
            </button>

            <img className="item-detail-screen__image" src={item.imageUrl} alt={item.title} />

            <div className="item-detail-screen__body">
                <p className="item-detail-screen__category">{item.category}</p>
                <h1>{item.title}</h1>
                <p className="item-detail-screen__price">¥{item.price.toLocaleString()}</p>
                <p>{item.description}</p>
                <p>希望: {item.wantedItem}</p>
                <p>出品者: {item.ownerName}</p>
                {isOwnItem ? (
                    <section className="item-detail-screen__owner-panel">
                        <div className="item-detail-screen__owner-heading">
                            <h2>届いた交換申請</h2>
                            <span>{receivedRequests.length}件</span>
                        </div>

                        {receivedRequests.length > 0 ? (
                            <div className="item-detail-screen__request-list">
                                {receivedRequests.map((request) => (
                                    <article className="item-detail-screen__request" key={request.id}>
                                        <div className="item-detail-screen__request-top">
                                            <strong>@{request.requesterName}</strong>
                                            <span className={`item-detail-screen__status item-detail-screen__status--${request.status}`}>
                                                {statusLabels[request.status]}
                                            </span>
                                        </div>
                                        <p className="item-detail-screen__offered">
                                            提示されたもの: {request.offeredItemTitle}
                                        </p>
                                        <p className="item-detail-screen__comment">{request.message}</p>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="item-detail-screen__empty-requests">
                                <p>まだこの商品への交換申請はありません。</p>
                                <span>申請が届くと、相手のコメントや提示された商品がここに表示されます。</span>
                            </div>
                        )}
                    </section>
                ) : (
                    <button
                        className="item-detail-screen__request-button"
                        onClick={() => onRequestTrade(item)}
                        type="button"
                    >
                        交換を申請する
                    </button>
                )}
            </div>
        </section>
    );
}

export default ItemDetailScreen;
