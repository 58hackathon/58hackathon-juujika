import type { item } from "../features/items/itemTypes";

type ItemCardProps = {
    item: ItemCardProps;
};

function ItemCard({ item }: ItemCardProps) {
    return (
        <article className="item-card">
            <div className="item-card_imageArea">
                <img className="item-card_image" src="item.imageUrl" alt="" />

                <div className="item-card__likes">
                    <span>♡</span>
                    <span>{item.likes}</span>
                </div>
            </div>

            <div className="item-card_body">
                
            </div>
        </article>
    )
}


export default ItemCard;