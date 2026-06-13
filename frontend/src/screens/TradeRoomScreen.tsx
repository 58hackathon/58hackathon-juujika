import { useEffect, useState } from "react";
import { getItemById } from "../features/items/itemApi";
import type { Item } from "../features/items/itemTypes";
import type { TradeRequest } from "../features/tradeRequests/tradeRequestTypes";
import "./TradeRoomScreen.css";

type TradeRoomScreenProps = {
    request: TradeRequest;
    onBack: () => void;
};

function TradeItemRow({
    label,
    item,
    title,
    userName,
}: {
    label: string;
    item?: Item;
    title: string;
    userName: string;
}) {
    return (
        <section className="trade-room-screen__section">
            <h2>{label}</h2>
            <div className="trade-room-screen__product">
                <img
                    src={item?.imageUrl ?? "/images/demo/generated/reading-card-500.png"}
                    alt=""
                />
                <div>
                    <strong>{title}</strong>
                    <span>@{userName}</span>
                </div>
            </div>
        </section>
    );
}

function TradeRoomScreen({ request, onBack }: TradeRoomScreenProps) {
    const [targetItem, setTargetItem] = useState<Item | undefined>();
    const [offeredItem, setOfferedItem] = useState<Item | undefined>();
    const partnerName =
        request.requesterId === "current_user"
            ? request.receiverName
            : request.requesterName;
    const isRequester = request.requesterId === "current_user";
    const partnerItem = isRequester ? targetItem : offeredItem;
    const myItem = isRequester ? offeredItem : targetItem;
    const partnerItemTitle = isRequester
        ? request.targetItemTitle
        : request.offeredItemTitle;
    const myItemTitle = isRequester
        ? request.offeredItemTitle
        : request.targetItemTitle;
    const partnerItemOwner = isRequester
        ? request.receiverName
        : request.requesterName;
    const myItemOwner = isRequester
        ? request.requesterName
        : request.receiverName;

    useEffect(() => {
        const loadItems = async () => {
            const [target, offered] = await Promise.all([
                getItemById(request.targetItemId),
                getItemById(request.offeredItemId),
            ]);

            setTargetItem(target);
            setOfferedItem(offered);
        };

        loadItems();
    }, [request.offeredItemId, request.targetItemId]);

    return (
        <section className="trade-room-screen">
            <div className="trade-room-screen__phone">
                <header className="trade-room-screen__top">
                    <button className="trade-room-screen__close" onClick={onBack} type="button" aria-label="閉じる">
                        ×
                    </button>
                    <h1>申請の詳細</h1>
                </header>

                <TradeItemRow
                    label="相手の商品"
                    item={partnerItem}
                    title={partnerItemTitle}
                    userName={partnerItemOwner}
                />

                <TradeItemRow
                    label="あなたの商品"
                    item={myItem}
                    title={myItemTitle}
                    userName={myItemOwner}
                />

                <section className="trade-room-screen__section">
                    <h2>相手からのメッセージ</h2>
                    <div className="trade-room-screen__message-row">
                        <div className="trade-room-screen__bubble">
                            <p>{request.message}</p>
                        </div>
                        <time>{new Date(request.createdAt).toLocaleDateString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                        })} 18:30</time>
                    </div>
                </section>

                <div className="trade-room-screen__celebration">
                    <img
                        src="/images/demo/generated/trade-success-banner.svg"
                        alt="交換が成立しました！おめでとうございます！"
                    />
                </div>

                <button className="trade-room-screen__primary" type="button">
                    ✈ メッセージを送る
                </button>
                <button className="trade-room-screen__secondary" type="button">
                    取引の流れを確認する
                </button>
            </div>
        </section>
    );
}

export default TradeRoomScreen;
