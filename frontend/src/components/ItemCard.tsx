import type { Item } from "../features/items/itemTypes";
import "./ItemCard.css";

type ItemCardProps = {
    item: Item;
    onSelectItem: (itemId: string) => void;
};

function ItemCard({ item, onSelectItem }: ItemCardProps) {
    const statusLabel = {
        available: "募集中",
        trading: "交渉中",
        completed: "成立",
    }[item.status];

    return (
        <article className="item-card">

            <div className="item-card__image-area">
                <img className="item-card__image" src={item.imageUrl} alt={item.title} />

                <div className="item-card__likes">
                    <span aria-hidden="true">♡</span>
                    <span>{item.likes}</span>
                </div>
            </div>
            <div className="item-card__body">
                <div className="item-card__meta">
                    <span className={`item-card__status item-card__status--${item.status}`}>
                        {statusLabel}
                    </span>
                    <span className="item-card__category">{item.category}</span>
                </div>

                <h2 className="item-card__title">{item.title}</h2>
                <p className="item-card__wanted">
                    希望: {item.wantedItem}
                </p>
                <p className="item-card__owner">
                    by {item.ownerName}
                </p>
                <div className="item-card__bottom">
                    <div className="item-card__price">
                        ¥{item.price.toLocaleString()}
                    </div>

                    <button className="item-card__favorite" aria-label={`${item.title}をお気に入りに追加`} type="button">
                        ☆
                    </button>
                    <button
                        className="item-card__detail-button"
                        onClick={() => onSelectItem(item.id)}
                        type="button"
                    >
                    詳細
                    </button>
                </div>
            </div>
        </article>
    );
}
export default ItemCard;
