import { useEffect, useMemo, useState } from "react";
import { getItems } from "../features/items/itemApi";
import type { Item } from "../features/items/itemTypes";
import { createTradeRequest } from "../features/tradeRequests/tradeRequestApi";
import { isCurrentUserResource } from "../features/users/currentUser";
import type { RegisteredUser } from "../features/users/userTypes";
import "./TradeRequestScreen.css";

type TradeRequestScreenProps = {
    currentUser: RegisteredUser;
    targetItem: Item;
    onBack: () => void;
    onSubmitted: () => void;
};

const maxMessageLength = 200;

function TradeRequestScreen({
    currentUser,
    targetItem,
    onBack,
    onSubmitted,
}: TradeRequestScreenProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [selectedOfferId, setSelectedOfferId] = useState("");
    const [message, setMessage] = useState(
        "はじめまして！大切に使ってきたものなので、よければ交換したいです。よろしくお願いします。"
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        const loadItems = async () => {
            const itemsFromApi = await getItems();
            setItems(itemsFromApi);
            const firstOffer = itemsFromApi.find(
                (item) =>
                    item.id !== targetItem.id &&
                    item.status === "available" &&
                    item.listingType === "direct" &&
                    isCurrentUserResource(item.ownerId, currentUser.id)
            );
            setSelectedOfferId(firstOffer?.id ?? "");
        };

        loadItems();
    }, [currentUser.id, targetItem.id]);

    const offerItems = useMemo(
        () =>
            items
                .filter(
                    (item) =>
                        item.id !== targetItem.id &&
                        item.status === "available" &&
                        item.listingType === "direct" &&
                        isCurrentUserResource(item.ownerId, currentUser.id)
                )
                .slice(0, 6),
        [currentUser.id, items, targetItem.id]
    );

    const selectedOffer = offerItems.find((item) => item.id === selectedOfferId);
    const canSubmit = Boolean(selectedOffer) && message.trim().length > 0 && !isSubmitting;

    const handleSubmit = async () => {
        if (!selectedOffer || !canSubmit) return;

        setIsSubmitting(true);
        await createTradeRequest({
            targetItemId: targetItem.id,
            targetItemTitle: targetItem.title,
            offeredItemId: selectedOffer.id,
            offeredItemTitle: selectedOffer.title,
            requesterId: currentUser.id,
            requesterName: currentUser.username,
            receiverId: targetItem.ownerId,
            receiverName: targetItem.ownerName,
            message: message.trim(),
        });
        setIsSubmitting(false);
        setIsComplete(true);
    };

    if (isComplete) {
        return (
            <section className="trade-request-screen">
                <div className="trade-request-screen__panel">
                    <div className="trade-request-screen__complete">
                        <div className="trade-request-screen__complete-mark" aria-hidden="true">✓</div>
                        <h2>交換申請を送りました！</h2>
                        <p>
                            相手から返信が来たらリクエスト一覧で確認できます。
                            申請中の交換はいつでも状況をチェックできます。
                        </p>
                        <button
                            className="trade-request-screen__submit"
                            onClick={onSubmitted}
                            type="button"
                        >
                            リクエスト一覧を見る
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="trade-request-screen">
            <div className="trade-request-screen__top">
                <button className="trade-request-screen__back" onClick={onBack} type="button" aria-label="戻る">
                    ‹
                </button>
                <div>
                    <h1 className="trade-request-screen__title">交換を申請する</h1>
                    <p className="trade-request-screen__lead">交換したい商品とメッセージを選んで送信します。</p>
                </div>
            </div>

            <div className="trade-request-screen__panel">
                <div className="trade-request-screen__stepper" aria-label="申請ステップ">
                    <div className="trade-request-screen__step trade-request-screen__step--active">
                        <span className="trade-request-screen__step-number">1</span>
                        相手の商品
                    </div>
                    <div className="trade-request-screen__step trade-request-screen__step--active">
                        <span className="trade-request-screen__step-number">2</span>
                        あなたの商品
                    </div>
                    <div className="trade-request-screen__step">
                        <span className="trade-request-screen__step-number">3</span>
                        送信
                    </div>
                </div>

                <div className="trade-request-screen__content">
                    <section className="trade-request-screen__section">
                        <div className="trade-request-screen__section-title">
                            <h2>相手の商品</h2>
                            <span>@{targetItem.ownerName}</span>
                        </div>
                        <div className="trade-request-screen__target">
                            <img src={targetItem.imageUrl} alt={targetItem.title} />
                            <div>
                                <h3>{targetItem.title}</h3>
                                <p className="trade-request-screen__meta">
                                    {targetItem.category} / ¥{targetItem.price.toLocaleString()}
                                </p>
                                <p className="trade-request-screen__wanted">希望: {targetItem.wantedItem}</p>
                            </div>
                        </div>
                    </section>

                    <section className="trade-request-screen__section">
                        <div className="trade-request-screen__section-title">
                            <h2>あなたの商品を選択</h2>
                            <span>{offerItems.length}件から選択</span>
                        </div>
                        {offerItems.length > 0 ? (
                            <div className="trade-request-screen__offers">
                                {offerItems.map((item) => (
                                    <button
                                        className={
                                            item.id === selectedOfferId
                                                ? "trade-request-screen__offer-card trade-request-screen__offer-card--selected"
                                                : "trade-request-screen__offer-card"
                                        }
                                        key={item.id}
                                        onClick={() => setSelectedOfferId(item.id)}
                                        type="button"
                                    >
                                        <img className="trade-request-screen__offer-image" src={item.imageUrl} alt="" />
                                        <h3>{item.title}</h3>
                                        <p className="trade-request-screen__offer-price">¥{item.price.toLocaleString()}</p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="trade-request-screen__empty-offers">
                                <h3>先に交換に出す商品を登録しましょう</h3>
                                <p>交換申請には、通常出品として交換できる自分の商品が1つ以上必要です。</p>
                            </div>
                        )}
                    </section>

                    <section className="trade-request-screen__section">
                        <div className="trade-request-screen__section-title">
                            <h2>コメント</h2>
                            <span>任意のひとことを添えられます</span>
                        </div>
                        <textarea
                            className="trade-request-screen__textarea"
                            maxLength={maxMessageLength}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder="交換したい理由や、商品の状態について書いてみましょう。"
                            value={message}
                        />
                        <div className="trade-request-screen__counter">
                            {message.length}/{maxMessageLength}
                        </div>
                    </section>

                    <div className="trade-request-screen__actions">
                        <button
                            className="trade-request-screen__submit"
                            disabled={!canSubmit}
                            onClick={handleSubmit}
                            type="button"
                        >
                            {isSubmitting ? "送信中..." : "申請を送る"}
                        </button>
                        <p className="trade-request-screen__notice">
                            送信後、相手が承認すると交換成立です。個人情報はチャットで必要になってから共有しましょう。
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default TradeRequestScreen;
