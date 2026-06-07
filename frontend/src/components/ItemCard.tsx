import type { Item } from "../features/items/itemTypes";
import "./ItemCard.css";

type ItemCardProps = {
    item: Item;
};

function ItemCard({ item }: ItemCardProps) {
    const statusLabel = {
    available: "募集中",
    trading: "交渉中",
    completed: "成立",
    }[item.status];

    return (
        <article className="item-card">

            <div className="item-card__imag-area">
                <img className="item-card__image" src="{item.imageUrl}" alt="" />

                <div className="item-card__likes">
                    <span>♡</span>
                    <span>{item.likes}</span>
                </div>
            </div>
            <div className="item-card__body">
                <span className={`item-card__status item-card__status--${item.status}`}>
                    {statusLabel}
                </span>

                <h2 className="item-card__title">{item.title}</h2>

                <div className="item-card__bottom">
                    <div className="item-card__price">¥25,000</div>

                    <button className="item-card__favorite" type="button">⭐︎</button>
                </div>
            </div>
        </article>
    );
}
export default ItemCard;