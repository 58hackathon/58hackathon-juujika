import type { item } from "../features/items/itemTypes";

type ItemCardProps = {
    item: Item;
};

function ItemCard({ item }: ItemCardProps) {
    return (
        <article className="item-card">

            <div className="item-card__imageArea">
                <img className="item-card_image" src="{item.imageUrl}" alt="" />

                <div className="item-card__likes">
                    <p>♡</p>
                    <p>item.likes</p>
                </div>
            </div>
            <div className="itemCardBody">
                <div className="item-card__status">
                    {item.status === "available" && "募集中"}
                    {item.status === "trading" && "交渉中"}
                    {item.status === "completed" && "成立"}
                </div>

                <h2 className="item-card__title">{item.title}</h2>

                <div className="item-card_bottom">
                    <div className="item-card__price">¥25,000</div>

                    <button className="item-card_favorite" type="button">⭐︎</button>
                </div>

                
            </div>

        </article>
    )
}