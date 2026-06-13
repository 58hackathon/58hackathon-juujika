import { useEffect, useState } from "react";
import { getItems } from "../features/items/itemApi";
import type { Item } from "../features/items/itemTypes";
import { getTradeRequests } from "../features/tradeRequests/tradeRequestApi";
import type { TradeRequest } from "../features/tradeRequests/tradeRequestTypes";
import { isCurrentUserResource } from "../features/users/currentUser";
import type { RegisteredUser } from "../features/users/userTypes";
import "./MyPageScreen.css";

type MyPageScreenProps = {
    currentUser: RegisteredUser;
    favoriteItemIds: string[];
    onBack: () => void;
    onLogout: () => void;
};

function MyPageScreen({
    currentUser,
    favoriteItemIds,
    onBack,
    onLogout,
}: MyPageScreenProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([]);

    useEffect(() => {
        const loadMyPageData = async () => {
            const [itemsFromApi, requestsFromApi] = await Promise.all([
                getItems(),
                getTradeRequests(),
            ]);

            setItems(itemsFromApi);
            setTradeRequests(requestsFromApi);
        };

        loadMyPageData();
    }, []);

    const myItems = items.filter((item) =>
        isCurrentUserResource(item.ownerId, currentUser.id)
    );
    const favoriteItems = items.filter((item) => favoriteItemIds.includes(item.id));
    const receivedRequests = tradeRequests.filter(
        (request) => isCurrentUserResource(request.receiverId, currentUser.id)
    );
    const visibleRequests =
        receivedRequests.length > 0 ? receivedRequests : tradeRequests.slice(0, 3);

    return (
        <section className="my-page-screen">
            <header className="my-page-screen__header">
                <button className="my-page-screen__back" onClick={onBack} type="button">
                    ←
                </button>

                <div className="my-page-screen__profile">
                    <img
                        className="my-page-screen__avatar"
                        src="/images/demo/e10821c74b533d465ba888ea66daa30f.jpg"
                        alt=""
                    />
                    <div>
                        <p className="my-page-screen__eyebrow">マイページ</p>
                        <h1>{currentUser.username}</h1>
                    </div>
                </div>
            </header>

            <section className="my-page-account">
                <div>
                    <p className="my-page-account__label">登録メール</p>
                    <strong>{currentUser.email}</strong>
                </div>
                <div>
                    <p className="my-page-account__label">プラン</p>
                    <strong>{getPlanLabel(currentUser.plan)}</strong>
                </div>
                <div>
                    <p className="my-page-account__label">配送先</p>
                    <strong>
                        {currentUser.shippingAddress.prefectureCity}
                        {currentUser.shippingAddress.addressLine}
                    </strong>
                </div>
                <button type="button" onClick={onLogout}>
                    ログアウト
                </button>
            </section>

            <div className="my-page-screen__stats">
                <div>
                    <span>{myItems.length}</span>
                    <p>出品中</p>
                </div>
                <div>
                    <span>{favoriteItems.length}</span>
                    <p>お気に入り</p>
                </div>
                <div>
                    <span>{visibleRequests.length}</span>
                    <p>受信リクエスト</p>
                </div>
            </div>

            <section className="my-page-section">
                <div className="my-page-section__title">
                    <h2>自分の出品</h2>
                    <span>{myItems.length}件</span>
                </div>

                {myItems.length > 0 ? (
                    <div className="my-page-list">
                        {myItems.map((item) => (
                            <article className="my-page-item" key={item.id}>
                                <img src={item.imageUrl} alt="" />
                                <div>
                                    <h3>{item.title}</h3>
                                    <p>{item.wantedItem || "交換希望なし"}</p>
                                </div>
                                <span className={`my-page-status my-page-status--${item.status}`}>
                                    {getItemStatusLabel(item.status)}
                                </span>
                            </article>
                        ))}
                    </div>
                ) : (
                    <p className="my-page-empty">まだ出品した商品はありません。</p>
                )}
            </section>

            <section className="my-page-section">
                <div className="my-page-section__title">
                    <h2>お気に入り</h2>
                    <span>{favoriteItems.length}件</span>
                </div>

                {favoriteItems.length > 0 ? (
                    <div className="my-page-favorites">
                        {favoriteItems.map((item) => (
                            <article className="my-page-favorite" key={item.id}>
                                <img src={item.imageUrl} alt="" />
                                <p>{item.title}</p>
                            </article>
                        ))}
                    </div>
                ) : (
                    <p className="my-page-empty">お気に入りした商品はまだありません。</p>
                )}
            </section>

            <section className="my-page-section">
                <div className="my-page-section__title">
                    <h2>受信した交換リクエスト</h2>
                    <span>{visibleRequests.length}件</span>
                </div>

                {visibleRequests.length > 0 ? (
                    <div className="my-page-list">
                        {visibleRequests.map((request) => (
                            <article className="my-page-request" key={request.id}>
                                <div>
                                    <p className="my-page-request__from">
                                        from {request.requesterName}
                                    </p>
                                    <h3>{request.offeredItemTitle}</h3>
                                    <p>希望: {request.targetItemTitle}</p>
                                </div>
                                <span className={`my-page-status my-page-status--${request.status}`}>
                                    {getRequestStatusLabel(request.status)}
                                </span>
                            </article>
                        ))}
                    </div>
                ) : (
                    <p className="my-page-empty">受信したリクエストはまだありません。</p>
                )}
            </section>
        </section>
    );
}

function getItemStatusLabel(status: Item["status"]): string {
    const labels = {
        available: "募集中",
        trading: "交渉中",
        completed: "成立",
    };

    return labels[status];
}

function getRequestStatusLabel(status: TradeRequest["status"]): string {
    const labels = {
        pending: "申請中",
        approved: "承認済み",
        rejected: "却下",
        completed: "成立",
    };

    return labels[status];
}

function getPlanLabel(plan: RegisteredUser["plan"]): string {
    const labels = {
        free: "Free",
        lite: "Lite",
        plus: "Plus",
    };

    return labels[plan];
}

export default MyPageScreen;
