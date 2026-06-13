import type { Item } from "../features/items/itemTypes";
import "./ItemCard.css";

type ItemCardProps = {
    item: Item;
    onSelectItem: (itemId: string) => void;
    isFavorite: boolean;
    onToggleFavorite: (itemId: string) => void;
};

const HOT_LIKE_THRESHOLD = 40;
const NEW_ITEM_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function ItemCard({
    item,
    onSelectItem,
    isFavorite,
    onToggleFavorite,
}: ItemCardProps) {
    const statusLabel = {
        available: "募集中",
        trading: "交渉中",
        completed: "成立",
    }[item.status];

    const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelectItem(item.id);
        }
    };

    const handleFavoriteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onToggleFavorite(item.id);
    };
    const favoriteCount = item.likes + (isFavorite ? 1 : 0);
    const createdAtTime = new Date(item.createdAt).getTime();
    const itemAgeMs = Date.now() - createdAtTime;
    const isNewItem =
        Number.isFinite(createdAtTime) &&
        itemAgeMs >= 0 &&
        itemAgeMs <= NEW_ITEM_THRESHOLD_MS;
    const isHotItem = favoriteCount >= HOT_LIKE_THRESHOLD;
    const featureBadge = isNewItem ? "NEW" : isHotItem ? "HOT" : null;
    const descriptionPreview =
        item.description.length > 34
            ? `${item.description.slice(0, 34)}...`
            : item.description;

    return (
        <article
            className="item-card"
            onClick={() => onSelectItem(item.id)}
            onKeyDown={handleCardKeyDown}
            role="button"
            tabIndex={0}
        >

            <div className="item-card__image-area">
                <img className="item-card__image" src={item.imageUrl} alt={item.title} />
                <div className="item-card__image-shade" aria-hidden="true" />
                {featureBadge && (
                    <span
                        className={`item-card__image-badge item-card__image-badge--${featureBadge.toLowerCase()}`}
                    >
                        {featureBadge}
                    </span>
                )}

                <button
                    aria-label={
                        isFavorite
                            ? `${item.title}をお気に入りから外す`
                            : `${item.title}をお気に入りに追加`
                    }
                    aria-pressed={isFavorite}
                    className={
                        isFavorite
                            ? "item-card__likes item-card__likes--active"
                            : "item-card__likes"
                    }
                    onClick={handleFavoriteClick}
                    type="button"
                >
                    <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
                    <span>{favoriteCount}</span>
                </button>
            </div>

            <div className="item-card__body">
                <div className="item-card__meta">
                    <span className={`item-card__status item-card__status--${item.status}`}>
                        {statusLabel}
                    </span>
                    <span className="item-card__category">{item.category}</span>
                </div>

                <h2 className="item-card__title">{item.title}</h2>
                <p className="item-card__description">{descriptionPreview}</p>
                <p className="item-card__wanted">
                    <span>希望</span>
                    {item.wantedItem}
                </p>
                <p className="item-card__owner">
                    by {item.ownerName}
                </p>
                <div className="item-card__bottom">
                    <div className="item-card__price">
                        ¥{item.price.toLocaleString()}
                    </div>
                    <span className="item-card__cta">詳しく見る</span>
                </div>
            </div>
        </article>
    );
}
export default ItemCard;
